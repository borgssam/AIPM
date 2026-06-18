from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime, date

# --- 1. 회원 및 인증 관련 스키마 ---
class UserCreate(BaseModel):
    username: str = Field(..., min_length=4, max_length=50, json_schema_extra={"example": "dev_kim"})
    password: str = Field(..., min_length=6, max_length=100, json_schema_extra={"example": "securepassword"})
    name: str = Field(..., max_length=100, json_schema_extra={"example": "김개발"})
    role: str = Field(..., json_schema_extra={"example": "DEVELOPER"})

class UserResponse(BaseModel):
    id: int
    username: str
    name: str
    role: str
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True
    }

class Token(BaseModel):
    access_token: str
    token_type: str

# --- 2. QA 검수 항목 스키마 ---
class QAItemResponse(BaseModel):
    id: int
    ticket_id: Optional[int] = None
    category: str
    title: str
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True
    }

# --- 3. Kanban 티켓 스키마 ---
class ProjectResponse(BaseModel):
    id: int
    name: str
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True
    }

class TicketResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    status: str
    priority: str
    project_id: Optional[int] = None
    assignee_id: Optional[int] = None
    assignee: Optional[UserResponse] = None
    resolution: Optional[str] = None
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    created_at: datetime
    updated_at: datetime
    qa_items: List[QAItemResponse] = []  # 티켓 상세 조회 시 QA 항목 바인딩 반환

    model_config = {
        "from_attributes": True
    }

class TicketUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assignee_id: Optional[int] = None
    start_date: Optional[date] = None
    due_date: Optional[date] = None

class ScheduleGenerateRequest(BaseModel):
    project_name: str = Field(..., json_schema_extra={"example": "신규 펫 프로젝트"})
    prd_content: str = Field(..., json_schema_extra={"example": "# 요구명세서\n..."})
    spec_content: str = Field(..., json_schema_extra={"example": "# 기능명세서\n..."})

class ScheduleGenerateResponse(BaseModel):
    created_tickets_count: int
    warning_tickets_count: int
    tickets: List[TicketResponse]
