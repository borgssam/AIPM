from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

# backend 폴더 내 모듈 임포트
from database import get_db
import models
import schemas
import auth_utils

router = APIRouter()

@router.get("/", response_model=List[schemas.UserResponse])
def get_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    """
    전체 가입 팀원 목록 조회 API (JWT 인증 필요)
    """
    users = db.query(models.User).all()
    return users
