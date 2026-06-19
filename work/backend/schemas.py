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
    prd_content: Optional[str] = None
    spec_content: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True
    }

class EpicResponse(BaseModel):
    id: int
    project_id: int
    title: str
    description: Optional[str] = None
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True
    }

class EpicCreate(BaseModel):
    project_id: int
    title: str = Field(..., min_length=1)
    description: Optional[str] = None
    start_date: Optional[date] = None
    due_date: Optional[date] = None

class TicketResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    status: str
    priority: str
    project_id: Optional[int] = None
    epic_ids: List[int] = []
    epics: List[EpicResponse] = []
    assignee_id: Optional[int] = None
    assignee: Optional[UserResponse] = None
    resolution: Optional[str] = None
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    created_at: datetime
    updated_at: datetime
    qa_items: List[QAItemResponse] = []

    model_config = {
        "from_attributes": True
    }

class TicketCreate(BaseModel):
    title: str
    description: Optional[str] = None
    status: str = "TO_DO"
    priority: str = "P1"
    project_id: int
    epic_ids: List[int] = []
    assignee_id: Optional[int] = None
    need_functional_qa: bool = False
    functional_qa_title: Optional[str] = None
    need_quality_qa: bool = False
    quality_qa_title: Optional[str] = None

class TicketUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assignee_id: Optional[int] = None
    epic_ids: Optional[List[int]] = None
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    need_functional_qa: Optional[bool] = None
    functional_qa_title: Optional[str] = None
    need_quality_qa: Optional[bool] = None
    quality_qa_title: Optional[str] = None

class ScheduleGenerateRequest(BaseModel):
    project_name: str = Field(..., json_schema_extra={"example": "신규 펫 프로젝트"})
    prd_content: str = Field(..., json_schema_extra={"example": "# 요구명세서\n..."})
    spec_content: str = Field(..., json_schema_extra={"example": "# 기능명세서\n..."})

class ScheduleGenerateResponse(BaseModel):
    created_epics_count: int
    warning_epics_count: int
    epics: List[EpicResponse]

# --- 4. AI Flink 할 일 추천 관련 스키마 ---
class TicketRecommendRequest(BaseModel):
    project_id: int
    epic_id: int
    exclude_existing: bool = False

class TicketRecommendItem(BaseModel):
    title: str
    description: Optional[str] = None
    priority: str = "P1"
    need_functional_qa: bool = False
    functional_qa_title: Optional[str] = None
    need_quality_qa: bool = False
    quality_qa_title: Optional[str] = None

class TicketRecommendResponse(BaseModel):
    recommendations: List[TicketRecommendItem]

class TicketBulkCreateItem(BaseModel):
    title: str
    description: Optional[str] = None
    priority: str = "P1"
    need_functional_qa: bool = False
    functional_qa_title: Optional[str] = None
    need_quality_qa: bool = False
    quality_qa_title: Optional[str] = None

class TicketBulkCreateRequest(BaseModel):
    project_id: int
    epic_id: int
    tickets: List[TicketBulkCreateItem]

class TicketBulkCreateResponse(BaseModel):
    created_count: int

