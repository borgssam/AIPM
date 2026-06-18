from database import engine, Base, SessionLocal
# ORM 모델들이 Base.metadata에 등록될 수 있도록 models 모듈 임포트
import models
from models import ProjectSetting, User
from auth_utils import hash_password

def init_db():
    print("Dropping existing database tables for schema reset...")
    Base.metadata.drop_all(bind=engine)

    print("Creating database tables based on ORM models...")
    # SQLite DB 파일 및 테이블 자동 생성
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # 1. 초기 설정 데이터 적재
        print("Inserting initial seed data: slack_webhook_url -> https://dummy-webhook.com")
        new_setting = ProjectSetting(
            key="slack_webhook_url",
            value="https://dummy-webhook.com"
        )
        db.add(new_setting)

        # 2. 초기 사용자 데이터 적재 (PM 및 개발자 계정)
        print("Seeding initial user accounts...")
        seed_users = [
            {"username": "pmpm", "password": "12345678", "name": "나피엠", "role": "PM"},
            {"username": "dev1", "password": "12345678", "name": "개발자1", "role": "DEVELOPER"},
            {"username": "dev2", "password": "12345678", "name": "개발자2", "role": "DEVELOPER"},
            {"username": "dev3", "password": "12345678", "name": "개발자3", "role": "DEVELOPER"},
            {"username": "dev4", "password": "12345678", "name": "개발자4", "role": "DEVELOPER"}
        ]

        for u_data in seed_users:
            hashed_pwd = hash_password(u_data["password"])
            db_user = User(
                username=u_data["username"],
                hashed_password=hashed_pwd,
                name=u_data["name"],
                role=u_data["role"]
            )
            db.add(db_user)

        db.commit()
        print("Database initialization and seeding completed successfully.")
    except Exception as e:
        db.rollback()
        print(f"An error occurred during database seeding: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
