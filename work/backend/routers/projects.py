from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
import auth_utils

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
