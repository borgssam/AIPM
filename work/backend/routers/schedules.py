import os
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

# backend 내부 모듈 임포트
from database import get_db
import models
import schemas
import auth_utils
from agents import orchestrator_agent

router = APIRouter()

@router.post("/generate", response_model=schemas.ScheduleGenerateResponse)
def generate_schedule(
    req: schemas.ScheduleGenerateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    # 1. PM 권한 제어 (Only PM can generate schedules)
    if current_user.role != "PM":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only users with the PM role can generate schedules."
        )

    # 1.1 프로젝트 명 유효성 체크
    project_name = req.project_name.strip()
    if not project_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="프로젝트 이름을 입력해 주세요."
        )

    # 1.2 실행할 에이전트가 최소 1개는 선택되어 있어야 함
    if not req.create_schedule_board and not req.create_kanban_tasks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="일정보드 자동생성과 칸반보드 태스크 자동생성 중 최소 하나는 선택해야 합니다."
        )

    # 1.3 일정보드(에픽) 생성 시에는 요구명세서/기능명세서 내용이 반드시 필요함
    if req.create_schedule_board and (not req.prd_content.strip() or not req.spec_content.strip()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="일정보드를 생성하려면 요구명세서(PRD)와 기능명세서(Spec) 내용이 모두 필요합니다."
        )

    # 1.2 중복 프로젝트 처리
    # - 일정보드를 새로 만드는 경우: 동일 이름 프로젝트가 있으면 덮어쓰기 위해 CASCADE 삭제 후 재생성
    # - 칸반 태스크만 생성하는 경우: 기존 에픽(일정)이 필요하므로 기존 프로젝트를 재사용
    try:
        existing_project = db.query(models.Project).filter(models.Project.name == project_name).first()

        if req.create_schedule_board:
            if existing_project:
                print(f"Overwriting project '{project_name}' (ID: {existing_project.id}). Deleting existing records...")
                db.delete(existing_project)
                db.flush()

            project = models.Project(
                name=project_name,
                prd_content=req.prd_content,
                spec_content=req.spec_content
            )
            db.add(project)
            db.flush()
        else:
            if not existing_project:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="칸반보드 태스크만 생성하려면 먼저 동일한 이름으로 일정보드가 생성된 프로젝트가 있어야 합니다."
                )
            existing_project.prd_content = req.prd_content
            existing_project.spec_content = req.spec_content
            project = existing_project
            db.flush()
    except HTTPException:
        raise
    except Exception as db_err:
        db.rollback()
        print(f"Database error during project creation: {db_err}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="프로젝트 초기 생성 중 오류가 발생했습니다."
        )

    # 2. 기존 로컬 DB 스펙 로드 시도 (컨텍스트 대조용)
    existing_api_spec = ""
    existing_db_schema = ""
    
    # plans/db_and_api_design.md 가 있다면 분석용 스펙 파일로 읽어오기
    plans_dir = os.path.join(os.path.dirname(__file__), "..", "..", "plans")
    db_design_path = os.path.join(plans_dir, "db_and_api_design.md")
    
    if os.path.exists(db_design_path):
        try:
            with open(db_design_path, "r", encoding="utf-8") as f:
                existing_db_schema = f.read()
        except Exception:
            pass

    # 3. 오케스트레이션 에이전트 호출 (선택된 옵션에 따라 ScheduleAgent / TaskAgent를 조합 실행)
    try:
        result = orchestrator_agent.run(
            db=db,
            project=project,
            prd_content=req.prd_content,
            spec_content=req.spec_content,
            create_schedule_board=req.create_schedule_board,
            create_kanban_tasks=req.create_kanban_tasks,
            existing_api_spec=existing_api_spec,
            existing_db_schema=existing_db_schema
        )
        return result
    except RuntimeError as agent_err:
        print(f"Agent execution failed: {agent_err}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(agent_err)
        )
    except Exception as e:
        print(f"AI schedule/task generation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="명세서 파싱에 실패했습니다. 파일 형식 및 내용을 다시 확인해주세요."
        )
