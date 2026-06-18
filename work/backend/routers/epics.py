from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date
from pydantic import BaseModel

from database import get_db
import models
import schemas
import auth_utils

router = APIRouter()

class EpicUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[date] = None
    due_date: Optional[date] = None

@router.get("/", response_model=List[schemas.EpicResponse])
def get_epics(
    project_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    """
    프로젝트 ID에 해당하는 모든 Epic 일정을 조회합니다.
    """
    query = db.query(models.Epic)
    if project_id is not None:
        query = query.filter(models.Epic.project_id == project_id)
    return query.all()

@router.put("/{epic_id}", response_model=schemas.EpicResponse)
def update_epic(
    epic_id: int,
    epic_update: EpicUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    """
    에픽 ID에 해당하는 에픽의 기간(시작일, 마감일)을 수정하는 API (PM 권한 필요)
    """
    if current_user.role != "PM":
        raise HTTPException(
            status_code=403,
            detail="PM 역할의 사용자만 에픽 일정을 수정할 수 있습니다."
        )
        
    epic = db.query(models.Epic).filter(models.Epic.id == epic_id).first()
    if not epic:
        raise HTTPException(status_code=404, detail="에픽을 찾을 수 없습니다.")

    update_data = epic_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(epic, key, value)
        
    db.commit()
    db.refresh(epic)
    return epic
