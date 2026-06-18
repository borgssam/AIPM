from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker, declarative_base

SQLALCHEMY_DATABASE_URL = "sqlite:///./ai_pm.db"

# SQLite는 기본적으로 멀티스레드 접속에 제한이 있을 수 있으므로 check_same_thread 설정을 False로 지정
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# SQLite 외래키 제약조건 강제 활성화 이벤트 리스너 연동 (ON DELETE CASCADE 정상 작동 보장)
@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# DB 세션 관리를 위한 get_db 의존성(Dependency) 정의
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
