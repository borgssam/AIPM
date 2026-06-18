import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Date, ForeignKey
from sqlalchemy.orm import relationship

# database.py에서 Base를 가져옴
from database import Base

# 역할(Role) Enum 정의
class UserRole(str, enum.Enum):
    PM = "PM"
    DEVELOPER = "DEVELOPER"
    DESIGNER = "DESIGNER"
    QA = "QA"

# 칸반 티켓 상태 Enum
class TicketStatus(str, enum.Enum):
    TO_DO = "TO_DO"
    TO_REVIEW = "TO_REVIEW"
    IN_PROGRESS = "IN_PROGRESS"
    DONE = "DONE"

# 티켓 우선순위 Enum
class TicketPriority(str, enum.Enum):
    P0 = "P0"  # 긴급/차단막 (Emergency/Blocker)
    P1 = "P1"  # 보통/핵심 (Normal)
    P2 = "P2"  # 낮음 (Low/Nice to have)

# QA 검수 상태 Enum
class QAItemStatus(str, enum.Enum):
    UNTESTED = "UNTESTED"
    PASS = "PASS"
    FAIL = "FAIL"

# --- User ORM 모델 ---
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    name = Column(String(100), nullable=False)
    role = Column(String(50), nullable=False, default=UserRole.DEVELOPER.value)
    
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 양방향 관계 설정
    tickets = relationship("KanbanTicket", back_populates="assignee")


# --- Project ORM 모델 ---
class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False)
    
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 양방향 관계 설정 (프로젝트 삭제 시 종속된 모든 티켓이 CASCADE 자동 삭제되도록 cascade 옵션 부여)
    tickets = relationship("KanbanTicket", back_populates="project", cascade="all, delete-orphan")


# --- KanbanTicket ORM 모델 ---
class KanbanTicket(Base):
    __tablename__ = "kanban_tickets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default=TicketStatus.TO_DO.value)
    priority = Column(String(20), nullable=False, default=TicketPriority.P1.value)
    
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=True)
    assignee_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    resolution = Column(Text, nullable=True)
    
    start_date = Column(Date, nullable=True)
    due_date = Column(Date, nullable=True)
    
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 양방향 관계 설정 (users.id SET NULL 대응)
    assignee = relationship("User", back_populates="tickets")
    
    # 프로젝트 관계 설정
    project = relationship("Project", back_populates="tickets")
    
    # cascade="all, delete-orphan"을 통해 티켓 삭제 시 매핑된 QA 항목 자동 삭제 보장
    qa_items = relationship("QAInspectionItem", back_populates="ticket", cascade="all, delete-orphan")


# --- QAInspectionItem ORM 모델 ---
class QAInspectionItem(Base):
    __tablename__ = "qa_inspection_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ticket_id = Column(Integer, ForeignKey("kanban_tickets.id", ondelete="CASCADE"), nullable=True)
    category = Column(String(50), nullable=False)  # 'FUNCTIONAL' or 'QUALITY'
    title = Column(String(255), nullable=False)
    status = Column(String(20), nullable=False, default=QAItemStatus.UNTESTED.value)
    
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 양방향 관계 설정 (kanban_tickets.id CASCADE 대응)
    ticket = relationship("KanbanTicket", back_populates="qa_items")


# --- ProjectSetting ORM 모델 ---
class ProjectSetting(Base):
    __tablename__ = "project_settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String(100), unique=True, nullable=False)
    value = Column(Text, nullable=True)
    
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
