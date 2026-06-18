# AI Project Manager (AI PM) 워크스페이스

본 프로젝트는 **Spec-Driven Development (명세 기반 개발, SDD)** 방법론을 도입하여 인간 PM과 개발 팀원 간의 협업 생산성을 극대화하기 위해 설계된 **'AI 기반 협업 어시스턴트 플랫폼'**입니다.

---

## 1. 개요

### 1.1 프로그램 목적
본 프로그램은 요구사항 명세서(PRD) 및 기능 명세서(Spec) 분석부터 시작하여, 개발 일정 수립, 칸반 기반 태스크 관리, QA 테스트 검수, 그리고 배포 승인에 이르는 소프트웨어 생명 주기를 AI 에이전트와 인간(Human-in-the-Loop)이 함께 조율할 수 있도록 지원하는 웹 애플리케이션입니다.

*   **AI 자동 WBS 분해:** 요구사항을 파싱하여 에픽 및 상세 개발 칸반 티켓, QA 검수 항목을 자동으로 일괄 매핑 생성합니다.
*   **리스크/상충 감지:** 기획 간 모순이 있거나 기존 데이터 구조와 상충될 경우 AI가 자동으로 감지해 경고 티켓을 발행하고 슬랙으로 알립니다.
*   **하드 게이트 기반 품질 방어:** 연계된 모든 기능/품질 검증 항목이 성공(`PASS`/`APPROVED`)해야만 티켓 완료(`DONE`) 전이가 가능한 강력한 품질 방어벽을 제공합니다.
*   **다국어 한글화 제약:** 영어 기획서가 제공되더라도 출력 데이터(일정, QA 명세, 티켓 정보)는 모두 한글로 번역하여 출력합니다.
*   **프로젝트 단위 격리:** 기획 분석 단위별로 데이터를 격리하여 멀티 프로젝트 관리를 지원합니다.

---

## 2. 프로그램 사용법

### 2.1 실행환경설정

#### 2.1.1 백엔드(FastAPI) 설정
*   **필수 요건:** Python 3.8 이상
*   **가상환경 구성:** 루트 폴더의 `.venv` 사용
*   **의존성 라이브러리 설치:**
    ```powershell
    pip install -r requirements.txt
    ```
*   **환경 변수 구성 (.env):** 루트 디렉터리에 `.env` 파일을 구성하여 AI 모델 및 트레이싱 설정을 관리합니다.
    ```env
    # OpenAI API 키 설정 (AI WBS 일정 및 기획 상충 분석에 필수)
    OPENAI_API_KEY=your_openai_api_key_here

    # Hugging Face 토큰 (필요시 사용)
    HUGGING_FACE_TOKEN=your_huggingface_token_here

    # LangChain / LangSmith 트레이싱 설정 (선택사항)
    LANGCHAIN_TRACING_V2=false
    LANGCHAIN_API_KEY=your_langchain_api_key_here
    LANGCHAIN_PROJECT=my-langchain-project
    ```
*   **데이터베이스:** 프로그램 구동 시 자동으로 SQLite 파일인 `ai_pm.db`가 생성되고 테이블이 구성됩니다.

#### 2.1.2 프론트엔드(React + Vite) 설정
*   **필수 요건:** Node.js (v18 이상 권장)
*   **패키지 설치:**
    ```powershell
    cd work/frontend
    npm install
    ```

#### 2.1.3 Spec Kit CLI 설치 (선택사항)
*   가상환경 활성화 상태에서 아래 명령어를 실행하여 CLI 도구를 설치할 수 있습니다.
    ```powershell
    pip install git+https://github.com/github/spec-kit.git
    ```

### 2.2 실행방법

#### 2.2.1 백엔드 실행
1. 터미널을 열고 가상환경을 활성화합니다.
   ```powershell
   .\.venv\Scripts\Activate.ps1
   ```
2. 백엔드 디렉터리로 이동 후 FastAPI 개발 서버를 가동합니다.
   ```powershell
   cd work/backend
   python main.py
   ```
   * 백엔드 API 서버는 기본적으로 `http://localhost:8000`에서 가동되며, `http://localhost:8000/docs`에서 OpenAPI(Swagger) 문서를 제공합니다.

#### 2.2.2 프론트엔드 실행
1. 새로운 터미널 창을 열고 프론트엔드 디렉터리로 이동합니다.
   ```powershell
   cd work/frontend
   ```
2. Vite 개발 서버를 가동합니다.
   ```powershell
   npm run dev
   ```
   * 프론트엔드 웹 서버는 기본적으로 `http://localhost:5173`에서 실행됩니다.

### 2.3 사용법
1. **회원가입 & 로그인:** 사용자 역할(`PM`, `DEVELOPER`, `DESIGNER`, `QA`)과 계정 정보로 회원가입 후 로그인합니다. (JWT 인증 기반)
2. **개발 일정 자동 생성 (PM 권한):** '일정관리' 탭 또는 기획 분석 화면에서 요구명세서와 기능명세서 텍스트를 입력하고 프로젝트명을 입력하여 일괄 생성 요청을 보냅니다.
3. **상충 해결 및 확인:** 분석 시 기존 로직과 상충되는 부분이 탐지되면 칸반보드 `TO_REVIEW` 열에 `[AI-Detected]` 카드가 등록되며, 연계 슬랙 채널로 실시간 알림이 발송됩니다.
4. **담당자 및 상태 조율:** 칸반 카드를 통해 담당 팀원(PM은 전체 배정 가능, 일반 팀원은 본인만 배정/해제 가능)을 선택하고 상태를 변경합니다.
5. **QA 테스트 검수:** QA 역할자는 각 검수명세서 화면에서 연계된 항목들의 성공(`PASS`) 및 실패(`FAIL`) 처리를 담당하고, PM 역할자가 최종 승인(`APPROVED`)을 수행합니다.
6. **티켓 완료 처리:** 티켓의 담당자 혹은 PM이 티켓을 완료(`DONE`)로 전이하고자 할 때, 연계된 모든 QA 항목이 `APPROVED` 상태여야 최종 완료 처리가 가능합니다. (하드 게이트 검증)

---

## 3. 스펙킷구성

명세 기반 개발(SDD)을 이끌어가는 핵심 템플릿과 설정 구조입니다.

*   **`.specify/`**
    *   **`memory/constitution.md`** : 프로젝트 헌법 문서로 개발 원칙, 코딩 컨벤션, 기술 스택 등을 정의합니다.
    *   **`templates/`** : 에이전트 협업용 산출물 템플릿 제공
        *   `spec-template.md` : 1단계 기능 명세서 작성을 위한 템플릿
        *   `plan-template.md` : 2단계 구현 계획서 작성을 위한 템플릿
        *   `tasks-template.md` : 3단계 상세 작업 분할 체크리스트 템플릿
*   **`specs/`** : 작성 및 관리되는 실제 기능 명세서 저장 폴더 (예: [ai_pm_spec.md](file:///c:/작업실/2026/KOSA_Agent/AIPM/specs/ai_pm_spec.md))
*   **`plans/`** : 구체적인 코드 설계 및 수정 계획서 저장 폴더 (예: [db_and_api_design.md](file:///c:/작업실/2026/KOSA_Agent/AIPM/plans/db_and_api_design.md))
*   **`tasks/`** : 개별 단위 태스크 체크리스트 저장 폴더

---

## 4. 프로그램 구성

워크스페이스 내의 주요 폴더 및 코드 구성은 다음과 같습니다.

```text
AIPM/
├── .specify/                       # Spec Kit 설정 및 컨벤션 템플릿
├── work/                           # 실제 프로젝트 개발 소스 코드
│   ├── backend/                    # FastAPI 기반 백엔드 애플리케이션
│   │   ├── routers/                # 기능별 API 라우터 (auth, users, schedules, tickets, qa, projects 등)
│   │   ├── main.py                 # 서버 엔트리 포인트 및 CORS 미들웨어 설정
│   │   ├── models.py               # SQLAlchemy ORM 데이터 모델 정의
│   │   ├── schemas.py              # Pydantic DTO 스키마 정의
│   │   ├── database.py             # SQLite DB 커넥션 및 세션 팩토리 설정
│   │   ├── init_db.py              # DB 테이블 생성 및 시드 데이터 주입
│   │   └── llm_service.py          # AI 분석 및 일정 분해 핵심 LLM API 모듈
│   └── frontend/                   # React + TypeScript + Vite + TailwindCSS 프론트엔드
│       ├── src/                    # 컴포넌트, 라우트, API 통신 모듈 등의 소스 코드
│       ├── package.json            # 프론트엔드 빌드/실행 패키지 스크립트 정의
│       └── vite.config.ts          # Vite 번들러 및 포트 설정
├── specs/                          # 요구사항 및 기능 명세서 문서 저장소
├── plans/                          # 기술 설계 및 상세 계획서 문서 저장소
├── tasks/                          # 실행 태스크 마일리스트 저장소
└── README.md                       # 본 안내 가이드
```

---

## 5. 추가사항

*   **SQLite DB 무결성 강화:** 외래키 미지원 이슈를 방지하기 위해 데이터베이스 세션 초기화 시 `PRAGMA foreign_keys = ON;` 옵션을 강제 적용하고 `ON DELETE CASCADE` 규칙을 주입하여 데이터 정합성을 유지합니다.
*   **슬랙 알림 동적 설정:** 알림 수신용 슬랙 인커밍 웹훅 URL은 `ProjectSetting` 테이블에 동적으로 관리되며, PM이 UI 상에서 설정값을 자유롭게 변경할 수 있습니다.
*   **안전한 보안 관리:** 사용자 비밀번호는 `bcrypt` 단방향 해싱을 사용하며, JWT 인증 만료 시간 정책을 통해 세션 보안을 강화했습니다.
