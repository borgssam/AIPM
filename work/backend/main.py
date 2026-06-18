from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import engine, Base, get_db
import models
from routers import auth, users, schedules, tickets, projects, epics, qa

# 백엔드 기동 시 테이블이 누락된 경우 자동 빌드되도록 호출
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Project Manager API",
    description="FastAPI Backend for AI PM Platform (Phase 1)",
    version="1.0.0"
)

# 프론트엔드 React/Vite 개발 서버와의 원활한 통신을 위한 CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 개발 단계 편의를 위해 모든 오리진 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 마일스톤 1, 2, 3: 각 기능 라우터 등록
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])
app.include_router(schedules.router, prefix="/api/v1/schedules", tags=["Schedules"])
app.include_router(tickets.router, prefix="/api/v1/tickets", tags=["Tickets"])
app.include_router(projects.router, prefix="/api/v1/projects", tags=["Projects"])
app.include_router(epics.router, prefix="/api/v1/epics", tags=["Epics"])
app.include_router(qa.router, prefix="/api/v1/qa", tags=["QA"])

@app.get("/")
def read_root():
    return {"message": "Welcome to AI Project Manager API server!"}

@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    """
    백엔드 서버 및 SQLite DB 연결 상태를 확인하는 헬스체크 API
    """
    try:
        # 데이터베이스 연결 및 초기 시드 유효성 테스트 검증
        slack_setting = db.query(models.ProjectSetting).filter(models.ProjectSetting.key == "slack_webhook_url").first()
        db_status = "Connected" if slack_setting else "Initialized (No Seed)"
        return {
            "status": "healthy",
            "database": db_status,
            "slack_webhook_url_configured": slack_setting.value if slack_setting else None
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": f"Error: {str(e)}"
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
