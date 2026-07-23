from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
import auth_utils
from agents import prd_agent, spec_agent

router = APIRouter()

@router.get("/", response_model=List[schemas.ProjectResponse])
def get_projects(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    """
    등록된 모든 프로젝트 목록을 반환하는 API (JWT 인증 적용)
    """
    projects = db.query(models.Project).order_by(models.Project.name.asc()).all()
    return projects


@router.post("/generate-prd", response_model=schemas.PrdGenerateResponse)
def generate_prd(
    req: schemas.PrdGenerateRequest,
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    """
    프로젝트 제목(title)만으로 PrdAgent가 요구명세서(PRD) 초안을 자동 작성하는 API.
    """
    if current_user.role != "PM":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only users with the PM role can generate PRD drafts."
        )

    project_name = req.project_name.strip()
    if not project_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="프로젝트 이름을 입력해 주세요."
        )

    try:
        prd_content = prd_agent.run(project_name=project_name)
    except Exception as e:
        print(f"PRD draft generation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="요구명세서 초안 생성에 실패했습니다. 잠시 후 다시 시도해주세요."
        )

    return {"prd_content": prd_content}


@router.post("/generate-spec", response_model=schemas.SpecGenerateResponse)
def generate_spec(
    req: schemas.SpecGenerateRequest,
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    """
    프로젝트 제목과 요구명세서(PRD)를 바탕으로 SpecAgent가 기능명세서(Spec) 초안을 자동 작성하는 API.
    """
    if current_user.role != "PM":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only users with the PM role can generate functional spec drafts."
        )

    project_name = req.project_name.strip()
    if not project_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="프로젝트 이름을 입력해 주세요."
        )

    prd_content = req.prd_content.strip()
    if not prd_content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="기능명세서 초안을 생성하려면 요구명세서(PRD) 내용이 먼저 필요합니다."
        )

    try:
        spec_content = spec_agent.run(project_name=project_name, prd_content=prd_content)
    except Exception as e:
        print(f"Spec draft generation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="기능명세서 초안 생성에 실패했습니다. 잠시 후 다시 시도해주세요."
        )

    return {"spec_content": spec_content}
