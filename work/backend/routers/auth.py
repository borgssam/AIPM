from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

# backend 폴더 내 모듈 임포트
from database import get_db
import models
import schemas
import auth_utils

router = APIRouter()

@router.post("/signup", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def signup(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    # 1. 중복 계정 가입 시도 체크
    existing_user = db.query(models.User).filter(models.User.username == user_in.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username is already registered."
        )
    
    # 2. 역할(Role) 유효성 검증
    allowed_roles = [role.value for role in models.UserRole]
    role_upper = user_in.role.upper()
    if role_upper not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid system role. Role must be one of {allowed_roles}"
        )
    
    # 3. 비밀번호 해싱 처리 및 사용자 DB 추가
    hashed_pwd = auth_utils.hash_password(user_in.password)
    db_user = models.User(
        username=user_in.username,
        hashed_password=hashed_pwd,
        name=user_in.name,
        role=role_upper
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # 1. 사용자 이름 대조
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    
    # 2. 패스워드 해시 대조 검증
    if not user or not auth_utils.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 3. 만료시간이 부여된 JWT 액세스 토큰 발행 및 반환
    access_token = auth_utils.create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(auth_utils.get_current_user)):
    """
    현재 로그인된 세션 사용자 정보 반환 (JWT 토큰 검증)
    """
    return current_user

