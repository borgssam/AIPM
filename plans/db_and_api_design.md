# 데이터베이스 및 API 설계서 (DB & API Design Plan)

본 문서는 `specs/ai_pm_spec.md` 요구사항에 정의된 **AI PM Phase 1** 구현을 위한 데이터베이스 스키마와 FastAPI 핵심 API 명세서입니다. 스케줄 자동 일괄 생성, UI 대시보드 연동, 사용자 인증(JWT), **우선순위 관리 및 설정 테이블, 백엔드 하드 게이트 검증 정책**이 추가되어 최종 확정되었습니다.

---

## 1. 데이터베이스 설계 (Database Schema Design)

SQLite와 PostgreSQL 간의 호환성을 유지하기 위해 데이터 타입은 표준 ANSI SQL 타입을 기준으로 하며, ORM(SQLAlchemy)을 통해 데이터베이스 엔진에 무관하게 작동하도록 구조화합니다.

### 1.1 테이블 구조

#### 1) `users` 테이블 (회원 관리)
| 컬럼명 | 데이터 타입 (SQL) | SQLAlchemy 타입 | 제약 조건 | 설명 |
| :--- | :--- | :--- | :--- | :--- |
| **id** | `INTEGER` | `Integer` | Primary Key, Auto-increment | 사용자 식별 고유 ID |
| **username** | `VARCHAR(50)` | `String(50)` | UNIQUE, NOT NULL | 사용자 로그인 고유 ID |
| **hashed_password** | `VARCHAR(255)` | `String(255)` | NOT NULL | 단방향 해싱 암호화된 비밀번호 |
| **name** | `VARCHAR(100)` | `String(100)` | NOT NULL | 사용자 실명 (예: `홍길동`) |
| **role** | `VARCHAR(50)` | `String(50)` | NOT NULL | 시스템 역할 (`PM`, `DEVELOPER`, `DESIGNER`, `QA`) |
| **created_at** | `TIMESTAMP` | `DateTime` | NOT NULL, Default: CURRENT_TIMESTAMP | 계정 생성 일시 |
| **updated_at** | `TIMESTAMP` | `DateTime` | NOT NULL, Default: CURRENT_TIMESTAMP | 계정 정보 수정 일시 |

#### 2) `projects` 테이블 (프로젝트 관리)
| 컬럼명 | 데이터 타입 (SQL) | SQLAlchemy 타입 | 제약 조건 | 설명 |
| :--- | :--- | :--- | :--- | :--- |
| **id** | `INTEGER` | `Integer` | Primary Key, Auto-increment | 프로젝트 식별 고유 ID |
| **name** | `VARCHAR(100)` | `String(100)` | UNIQUE, NOT NULL | 프로젝트 이름 |
| **prd_content** | `TEXT` | `Text` | NULLABLE | 요구명세서 (PRD) 내용 |
| **spec_content** | `TEXT` | `Text` | NULLABLE | 기능명세서 (Spec) 내용 |
| **created_at** | `TIMESTAMP` | `DateTime` | NOT NULL, Default: CURRENT_TIMESTAMP | 생성 일시 |
| **updated_at** | `TIMESTAMP` | `DateTime` | NOT NULL, Default: CURRENT_TIMESTAMP | 최종 변경 일시 |

#### 3) `epics` 테이블 (에픽/일정 관리)
| 컬럼명 | 데이터 타입 (SQL) | SQLAlchemy 타입 | 제약 조건 | 설명 |
| :--- | :--- | :--- | :--- | :--- |
| **id** | `INTEGER` | `Integer` | Primary Key, Auto-increment | 에픽 식별 고유 ID |
| **project_id** | `INTEGER` | `Integer` | Foreign Key (projects.id), NOT NULL | 소속 프로젝트 ID |
| **title** | `VARCHAR(255)` | `String(255)` | NOT NULL | 에픽 제목 (Gantt 일정의 이름) |
| **description** | `TEXT` | `Text` | NULLABLE | 상세 내용 |
| **start_date** | `DATE` | `Date` | NULLABLE | 작업 시작 예정일 |
| **due_date** | `DATE` | `Date` | NULLABLE | 작업 마감 예정일 |
| **created_at** | `TIMESTAMP` | `DateTime` | NOT NULL, Default: CURRENT_TIMESTAMP | 생성 일시 |

#### 4) `kanban_tickets` 테이블 (칸반 관리)
| 컬럼명 | 데이터 타입 (SQL) | SQLAlchemy 타입 | 제약 조건 | 설명 |
| :--- | :--- | :--- | :--- | :--- |
| **id** | `INTEGER` | `Integer` | Primary Key, Auto-increment | 티켓 식별 고유 ID |
| **epic_id** | `INTEGER` | `Integer` | Foreign Key (epics.id), NULLABLE | 소속 에픽 ID |
| **title** | `VARCHAR(255)` | `String(255)` | NOT NULL | 티켓 제목 |
| **description** | `TEXT` | `Text` | NULLABLE | 상세 내용 |
| **status** | `VARCHAR(50)` | `String(50)` | NOT NULL, Default: 'TO_DO' | 칸반 카드 상태 (`TO_DO`, `IN_PROGRESS`, `TO_REVIEW`, `DONE`) |
| **assignee_id** | `INTEGER` | `Integer` | Foreign Key (users.id), NULLABLE | 담당 사용자 ID |
| **priority** | `VARCHAR(20)` | `String(20)` | NOT NULL, Default: 'P1' | 우선순위 (`P0`, `P1`, `P2`) |
| **created_at** | `TIMESTAMP` | `DateTime` | NOT NULL, Default: CURRENT_TIMESTAMP | 생성 일시 |
| **updated_at** | `TIMESTAMP` | `DateTime` | NOT NULL, Default: CURRENT_TIMESTAMP | 수정 일시 |

#### 5) `qa_inspection_items` 테이블 (검수 명세 관리)
| 컬럼명 | 데이터 타입 (SQL) | SQLAlchemy 타입 | 제약 조건 | 설명 |
| :--- | :--- | :--- | :--- | :--- |
| **id** | `INTEGER` | `Integer` | Primary Key, Auto-increment | 검수 항목 고유 ID |
| **ticket_id** | `INTEGER` | `Integer` | Foreign Key (kanban_tickets.id), NOT NULL | 매핑된 칸반 티켓 ID |
| **category** | `VARCHAR(50)` | `String(50)` | NOT NULL | 검수 구분 (`FUNCTIONAL` / `QUALITY`) |
| **title** | `VARCHAR(255)` | `String(255)` | NOT NULL | 검수 요건 내용 |
| **status** | `VARCHAR(20)` | `String(20)` | NOT NULL, Default: 'UNTESTED' | 검수 상태 (`UNTESTED`, `PASS`/`TESTED`, `FAIL`, `APPROVED`) |
| **created_at** | `TIMESTAMP` | `DateTime` | NOT NULL, Default: CURRENT_TIMESTAMP | 생성 일시 |
| **updated_at** | `TIMESTAMP` | `DateTime` | NOT NULL, Default: CURRENT_TIMESTAMP | 최종 업데이트 일시 |
#### 6) `project_settings` 테이블 (시스템 전역 설정 관리)
| 컬럼명 | 데이터 타입 (SQL) | SQLAlchemy 타입 | 제약 조건 | 설명 |
| :--- | :--- | :--- | :--- | :--- |
| **id** | `INTEGER` | `Integer` | Primary Key, Auto-increment | 설정 인덱스 ID |
| **key** | `VARCHAR(100)` | `String(100)` | UNIQUE, NOT NULL | 설정 키 (예: `slack_webhook_url`) |
| **value** | `TEXT` | `Text` | NULLABLE | 설정 값 (예: `https://hooks.slack.com/services/...`) |
| **updated_at** | `TIMESTAMP` | `DateTime` | NOT NULL, Default: CURRENT_TIMESTAMP | 최종 변경 일시 |

---

### 1.2 SQLAlchemy ORM 모델 정의 (Python)
```python
import enum
from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Text, DateTime, Date, ForeignKey
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

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
    APPROVED = "APPROVED"

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

    tickets = relationship("KanbanTicket", back_populates="assignee")

# --- Project ORM 모델 ---
class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False)
    prd_content = Column(Text, nullable=True)
    spec_content = Column(Text, nullable=True)
    
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    tickets = relationship("KanbanTicket", back_populates="project", cascade="all, delete-orphan")
    epics = relationship("Epic", back_populates="project", cascade="all, delete-orphan")

# --- Epic ORM 모델 ---
class Epic(Base):
    __tablename__ = "epics"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    start_date = Column(Date, nullable=True)
    due_date = Column(Date, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    tickets = relationship("KanbanTicket", back_populates="epic", cascade="all, delete-orphan")

# --- KanbanTicket ORM 모델 ---
class KanbanTicket(Base):
    __tablename__ = "kanban_tickets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    epic_id = Column(Integer, ForeignKey("epics.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default=TicketStatus.TO_DO.value)
    priority = Column(String(20), nullable=False, default=TicketPriority.P1.value)
    
    assignee_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 관계 설정
    epic = relationship("Epic", back_populates="tickets")
    assignee = relationship("User", back_populates="tickets")
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

    # 관계 설정
    ticket = relationship("KanbanTicket", back_populates="qa_items")

# --- ProjectSetting ORM 모델 ---
class ProjectSetting(Base):
    __tablename__ = "project_settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String(100), unique=True, nullable=False)
    value = Column(Text, nullable=True)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
```

---

## 2. API 엔드포인트 설계 (FastAPI API Design)

### 2.1 Pydantic 스키마 정의 (DTO)
```python
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime, date

# --- 1. 회원 및 인증 관련 스키마 ---
class UserCreate(BaseModel):
    username: str = Field(..., min_length=4, max_length=50, example="dev_kim")
    password: str = Field(..., min_length=6, max_length=100, example="securepassword")
    name: str = Field(..., max_length=100, example="김개발")
    role: str = Field(..., example="DEVELOPER")

class UserResponse(BaseModel):
    id: int
    username: str
    name: str
    role: str
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

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

    class Config:
        orm_mode = True

class QAItemUpdate(BaseModel):
    status: str = Field(..., example="PASS")

# --- 3. Kanban 티켓 및 프로젝트 관련 스키마 ---
class ProjectResponse(BaseModel):
    id: int
    name: str
    prd_content: Optional[str] = None
    spec_content: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

class EpicResponse(BaseModel):
    id: int
    project_id: int
    title: str
    description: Optional[str] = None
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

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
    assignee_id: Optional[int] = None
    assignee: Optional[UserResponse] = None
    resolution: Optional[str] = None
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    created_at: datetime
    updated_at: datetime
    qa_items: List[QAItemResponse] = []  # 티켓 상세 조회 시 QA 항목 바인딩 반환

    class Config:
        orm_mode = True

class ScheduleGenerateRequest(BaseModel):
    project_name: str = Field(..., example="신규 프로젝트")
    prd_content: str = Field(..., example="# 요구명세서\n...")
    spec_content: str = Field(..., example="# 기능명세서\n...")

class ScheduleGenerateResponse(BaseModel):
    created_epics_count: int
    warning_epics_count: int
    epics: List[EpicResponse] = []

class TicketUpdate(BaseModel):
    assignee_id: Optional[int] = Field(None, example=2)
    status: Optional[str] = Field(None, example="IN_PROGRESS")
    priority: Optional[str] = Field(None, example="P0")
    resolution: Optional[str] = Field(None, example="임시 기재 해결 방안")
    start_date: Optional[date] = Field(None, example="2026-06-18")
    due_date: Optional[date] = Field(None, example="2026-06-30")

class TicketResolve(BaseModel):
    resolution: str = Field(..., example="모든 품질 규격을 만족하여 조율을 완료함.")

# --- 4. 전역 시스템 설정 스키마 ---
class ProjectSettingResponse(BaseModel):
    id: int
    key: str
    value: Optional[str] = None
    updated_at: datetime

    class Config:
        orm_mode = True

class ProjectSettingUpdate(BaseModel):
    value: str = Field(..., example="https://hooks.slack.com/services/...")
```

---

### 2.2 핵심 API 엔드포인트 목록

모든 API 호출 시 JWT 만료 검증이 수반되며, 만료 시 백엔드는 즉시 **`401 Unauthorized`** 응답을 반환합니다.

#### [기능 5] 사용자 가입, 로그인 및 팀원 조회
*   `POST /api/v1/auth/signup` : 회원 가입 (비밀번호 단방향 해싱).
*   `POST /api/v1/auth/login` : 로그인 (JWT 액세스 토큰 발행, 만료시간 적용).
*   `GET /api/v1/users` : 전체 가입 팀원 목록 조회 (드롭다운 구성용, JWT 필요).

#### [기능 1] 요구명세서 기반 스케줄 자동 생성 및 이슈 등록
*   **엔드포인트:** `POST /api/v1/schedules/generate`
*   **보안:** JWT 인증 필요 (PM 권한 전용: `role == 'PM'`)
*   **에러 처리 (파싱 실패):** 명세 텍스트 파싱 및 AI WBS 분해 실패 시 **`400 Bad Request`** (메시지: `"명세서 파싱에 실패했습니다. 파일 형식 및 내용을 다시 확인해주세요."`)를 반환합니다.
*   **구현 아키텍처:** 
    1. AI(Gemini)에 데이터를 제공하여 태스크 및 티켓과 연계된 QA 항목 리스트를 도출합니다.
    2. 생성된 각 티켓 정보(`title`, `description`, `start_date`, `due_date`, `priority`)를 DB에 벌크 삽입합니다.
    3. 새로 생성된 각 티켓 ID를 외래키(`ticket_id`)로 설정하여 연계된 `qa_inspection_items`를 DB에 벌크 삽입하여 무결성을 확보합니다.
    4. 논리 상충 감지 시 `TO_REVIEW` 상태의 `[AI-Detected]` 카드를 추가로 삽입하고 슬랙 알림을 쏩니다.

#### [기능 2] 티켓 상태/정보 수정 (담당자 지정, 일정/우선순위 변경 등)
*   **엔드포인트:** `PATCH /api/v1/tickets/{ticket_id}`
*   **요청 바디:** `TicketUpdate`
*   **보안/RBAC:** JWT 인증 필요.
    *   `assignee_id` 수정은 오직 `PM`만 가능합니다. (PM이 아닌 사용자가 요청 시 `403 Forbidden` 발생)
    *   우선순위, 일정, 상태 갱신은 해당 카드의 기존 배정자(`assignee_id`) 또는 `PM` 권한을 가진 사람만 요청 가능합니다.

#### [기능 3] 조율 완료 및 해결 방안 등록 (백엔드 하드 게이트 검증)
*   **엔드포인트:** `POST /api/v1/tickets/{ticket_id}/resolve`
*   **요청 바디:** `TicketResolve`
*   **보안/RBAC:** JWT 인증 필요. 티켓 담당자 또는 `PM`만 완료 처리가 가능합니다.
*   **하드 게이트 검증:** 
    *   완료 처리 시, DB를 조회하여 해당 `ticket_id`에 매핑된 모든 `qa_inspection_items`의 상태가 **`PASS`**인지 판별합니다.
    *   하나라도 `PASS`가 아니거나 검사 항목이 완료되지 않은 상태라면, 백엔드는 즉시 **`400 Bad Request`** (메시지: `"모든 연계 검수 체크리스트 항목이 완료(PASS) 상태여야만 티켓을 완료할 수 있습니다."`)를 반환하며 상태 변경(`DONE` 전이)을 거부합니다.

#### [기타] 칸반보드 및 일정관리용 전체/개별 티켓 조회
*   `GET /api/v1/tickets` : 카드 검색 키워드 및 우선순위 필터링 쿼리 파라미터(`search`, `priority`, `assignee_id`) 지원.
*   `GET /api/v1/tickets/{ticket_id}` : 개별 티켓 상세 정보 및 소속 `qa_items` 리스트 반환.

#### [신규] 에픽 일정 추가 및 수정
*   **엔드포인트:** `POST /api/v1/epics/`
*   **보안:** JWT 인증 필요 (PM 권한 전용: `role == 'PM'`)
*   **요청 바디:** `EpicCreate`
*   **설명:** 지정한 프로젝트에 새로운 에픽(일정)을 수동으로 추가합니다. (프론트엔드 UI 등록 모달에서는 시작 및 마감 날짜의 기본값으로 오늘 날짜를 미리 세팅하여 제공합니다.)
*   **엔드포인트:** `PUT /api/v1/epics/{epic_id}`
*   **보안:** JWT 인증 필요 (PM 권한 전용: `role == 'PM'`)
*   **요청 바디:** `EpicUpdate`
*   **설명:** 기존 에픽 일정을 변경(수정)합니다.

#### [기능 4] 기능/품질 검수 명세 체크리스트 전체 조회 및 토글
*   `GET /api/v1/qa/items` : 검수 항목 리스트 조회. `ticket_id` 및 `category` 쿼리 필터 지원.
*   `PATCH /api/v1/qa/items/{item_id}` : 검수 상태 토글 (`UNTESTED` -> `PASS` -> `FAIL` 등).

#### [기능 5] 프로젝트 전역 설정 관리 (Slack 알림 설정 등)
*   **엔드포인트:** `PATCH /api/v1/settings/{key}`
*   **설명:** 슬랙 인커밍 웹훅 URL 등 전역 시스템 설정을 DB 상에서 동적으로 변경합니다.
*   **보안:** JWT 인증 필요 (PM 권한 전용: `role == 'PM'`). 일반 팀원이 접근 시 `403 Forbidden` 반환.
*   **요청 바디:** `ProjectSettingUpdate`
*   **응답:** `200 OK` / `ProjectSettingResponse`

---

## 3. 호환성 및 마이그레이션 고려사항 (Migration & Scalability)

- **SQLite 외래키 활성화 및 CASCADE:** SQLite에서 상충 티켓 삭제나 마일스톤 초기화 시 무결성이 유지되도록 `ON DELETE CASCADE` 설정을 적용하고 데이터베이스 세션 초기화 시 `PRAGMA foreign_keys = ON;`을 강제 활성화합니다.
- **설정 초기 데이터 적재:** 어플리케이션 초기 가동 시 `project_settings` 테이블에 `slack_webhook_url` 설정 레코드를 기본 삽입해 놓는 마이그레이션 단계를 추가합니다.

---

## 4. 프론트엔드 다이내믹 테마 설계 (Dynamic Theme Design)

프론트엔드 UI의 일관된 테마 스위칭을 위해 CSS의 `data-theme` 속성과 글로벌 스타일시트(`index.css`)의 규칙을 조합해 구현합니다.

### 4.1 테마 데이터 모델 및 상태 관리
*   **상태 정의:** `App.tsx`에서 `'dolphin'` (기본값) | `'sunflower'` | `'marigold'`(금잔디) 세 가지 문자열로 현재 테마 상태를 로컬 상태(`theme`)로 관리합니다.
*   **영속성 보장:** 사용자가 변경한 테마 정보는 브라우저의 `localStorage`의 `theme` 키에 동기화되어 저장되고, 마운트 시 이를 로드하여 상태의 초기값으로 할당합니다.
*   **동적 적용:** 테마 값이 변경될 때마다 `document.documentElement.setAttribute('data-theme', theme)`를 호출하여 HTML 루트 객체에 선택된 테마 속성을 동적으로 인스턴싱합니다.

### 4.2 글로벌 CSS 선택자 정의
`index.css` 내에서 `[data-theme='dolphin']`, `[data-theme='sunflower']`, `[data-theme='marigold']` 클래스 하위의 색상 스타일을 오버라이딩합니다.
*   `dolphin` (돌고래 - 푸른 바다): 진한 바다 파랑 바탕 및 스카이 블루/사이언 브랜드 포인트
*   `sunflower` (해바라기 - 노랑/주황): 웜 챠콜 및 해바라기 옐로우/오렌지 포인트
*   `marigold` (금잔디 - 녹색/연두): 다크 포레스트 그린 바탕 및 연두/에메랄드/민트 포인트
