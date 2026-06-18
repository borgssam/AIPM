import os
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

# backend 내부 모듈 임포트
from database import get_db
import models
import schemas
import auth_utils
import llm_service
from slack_utils import send_slack_notification

router = APIRouter()

def parse_date(date_str: str, default_offset_days: int = 0) -> any:
    """
    날짜 문자열을 Python date 객체로 변환하며 실패 시 기본 오프셋 날짜를 산출해 반환합니다.
    """
    try:
        return datetime.strptime(date_str, "%Y-%m-%d").date()
    except Exception:
        return (datetime.today() + timedelta(days=default_offset_days)).date()

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

    # 1.2 중복 프로젝트 처리 (동일 프로젝트가 존재하면 덮어쓰기 위해 CASCADE 삭제)
    try:
        existing_project = db.query(models.Project).filter(models.Project.name == project_name).first()
        if existing_project:
            print(f"Overwriting project '{project_name}' (ID: {existing_project.id}). Deleting existing records...")
            db.delete(existing_project)
            db.flush()
            
        # 신규 프로젝트 적재
        project = models.Project(name=project_name)
        db.add(project)
        db.flush()
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

    # 3. LLM AI 분석 호출
    try:
        analysis_result = llm_service.analyze_specifications(
            prd_content=req.prd_content,
            spec_content=req.spec_content,
            existing_api_spec=existing_api_spec,
            existing_db_schema=existing_db_schema
        )
    except Exception as e:
        print(f"LLM Schedule generation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="명세서 파싱에 실패했습니다. 파일 형식 및 내용을 다시 확인해주세요."
        )

    epics_data = analysis_result.get("epics", [])
    conflicts_data = analysis_result.get("conflicts", [])

    created_epics = []
    warning_count = 0

    try:
        # 4.1 개발 에픽 일정 저장
        for epic_item in epics_data:
            start_d = parse_date(epic_item.get("start_date"), 0)
            due_d = parse_date(epic_item.get("due_date"), 5)
            
            db_epic = models.Epic(
                project_id=project.id,
                title=epic_item.get("title", "Generated Epic"),
                description=epic_item.get("description", ""),
                start_date=start_d,
                due_date=due_d
            )
            db.add(db_epic)
            db.flush()
            created_epics.append(db_epic)

        # 4.2 상충 경고 에픽 인서트 및 실시간 슬랙 알림 발송
        for conflict_item in conflicts_data:
            start_d = parse_date(conflict_item.get("start_date"), 0)
            due_d = parse_date(conflict_item.get("due_date"), 0)
            
            title = conflict_item.get("title", "Logical Mismatch")
            if not title.startswith("[AI-Detected]"):
                title = f"[AI-Detected] {title}"
                
            db_conflict = models.Epic(
                project_id=project.id,
                title=title,
                description=conflict_item.get("description", "logical contradiction detected in design spec."),
                start_date=start_d,
                due_date=due_d
            )
            db.add(db_conflict)
            db.flush()
            
            warning_count += 1
            created_epics.append(db_conflict)
            
            # 실시간 슬랙 웹훅 발송 트리거
            slack_msg = f"⚠️ [AI-Detected] 기획 충돌 이슈가 등록되었습니다. WBS 타임라인을 확인해 주세요.\n*이슈 제목*: {title}\n*상세 내용*: {db_conflict.description}"
            send_slack_notification(db, slack_msg)

        # 트랜잭션 커밋 확정
        db.commit()
        
        # 관계형 필드를 최신 상태로 바인딩하여 응답하기 위해 refresh
        for e in created_epics:
            db.refresh(e)
            
        return {
            "created_epics_count": len(epics_data),
            "warning_epics_count": warning_count,
            "epics": created_epics
        }

    except Exception as db_err:
        db.rollback()
        print(f"Database error during schedule transaction: {db_err}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="일정 데이터베이스 저장 중 오류가 발생했습니다."
        )
