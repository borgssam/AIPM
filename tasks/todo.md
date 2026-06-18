# 프로젝트 개발 태스크 리스트 (Project Todo List)

본 문서는 `specs/ai_pm_spec.md` 및 `plans/` 아래의 모든 설계 문서를 토대로 수립된 **AI PM Phase 1**의 개발 체크리스트입니다. 최종 합의한 **5대 고도화 사항(인증, 우선순위 필터, 슬랙 UI, QA 벌크 매핑, 검색)**과 **마일스톤 5(테스트)**까지 모두 포함된 최종 버전입니다. 

각 마일스톤별로 쪼개진 세부 작업들을 구현하면서 완료된 항목에 `[X]` 표시를 하며 진척도를 관리합니다.

---

## 📅 마일스톤 1: 백엔드 기초 및 DB 구축 (인증 기초 포함)

- [ ] **1.1 DB 연결 모듈 구현 (`database.py`):**
  - [ ] SQLite 파일(`ai_pm.db`) 연결 설정 및 SQLAlchemy `Engine` 생성.
  - [ ] DB 세션 관리를 위한 `get_db` 의존성(Dependency) 정의.
  - [ ] SQLite 외래키 제약조건 적용 (`PRAGMA foreign_keys = ON;` 이벤트 리스너 연동).
- [ ] **1.2 DB ORM 모델 정의 (`models.py`):**
  - [ ] `User` 모델 정의 (`id`, `username`, `hashed_password`, `name`, `role` [PM, Developer, Designer, QA], 타임스탬프).
  - [ ] `KanbanTicket` 모델 정의 (`id`, `title`, `description`, `status` [TO_DO, TO_REVIEW, IN_PROGRESS, DONE], `assignee_id` 외래키, `priority` [P0, P1, P2], `resolution` [해결방안 텍스트], `start_date`, `due_date`, 타임스탬프).
  - [ ] `QAInspectionItem` 모델 정의 (`id`, `ticket_id` 외래키 [CASCADE 설정], `category`, `title`, `status` ['UNTESTED', 'PASS', 'FAIL'], 타임스탬프).
  - [ ] `ProjectSetting` 모델 정의 (`id`, `key` [UNIQUE], `value`, 타임스탬프).
  - [ ] ORM 관계 설정 (`User` <-> `KanbanTicket` / `KanbanTicket` <-> `QAInspectionItem`).
- [ ] **1.3 DB 테이블 생성 및 시드 스크립트 작성 (`init_db.py`):**
  - [ ] 로컬 SQLite DB 테이블 자동 빌드 로직 작성.
  - [ ] 초기 어드민 계정(PM 권한) 및 기본 설정 시드 적재 (key: `slack_webhook_url`, value: 초기 웹훅 주소).
- [ ] **1.4 인증 및 비밀번호 암호화 유틸 구현 (`auth_utils.py`):**
  - [ ] `bcrypt` 비밀번호 해싱 및 검증 유틸 함수 구현.
  - [ ] 만료시간(Expiration)이 설정된 JWT 액세스 토큰 생성 및 토큰 검증(디코딩) 함수 작성.
- [ ] **1.5 회원가입 & 로그인 라우터 구현 (`routers/auth.py`):**
  - [ ] 회원가입 엔드포인트(`POST /api/v1/auth/signup`) 구현 (중복 가입 방지).
  - [ ] 로그인 엔드포인트(`POST /api/v1/auth/login`) 구현 (OAuth2, JWT 반환).
- [ ] **1.6 팀원 목록 조회 라우터 구현 (`routers/users.py`):**
  - [ ] 전체 가입자 정보 조회 엔드포인트(`GET /api/v1/users`) 구현 (JWT 인증 적용).

---

## 📅 마일스톤 2: 명세서 파싱 및 QA 벌크 매핑 연계 스케줄 자동 생성

- [ ] **2.1 명세서 파일 수신 및 파싱 유틸 구현 (`parser_utils.py`):**
  - [ ] 업로드된 마크다운 데이터 유효성 검사 헬퍼 구현.
- [ ] **2.2 LLM(Gemini) 연동 모듈 구현 (`llm_service.py`):**
  - [ ] 명세서 분석을 통한 WBS 작업 분해 및 `[시작일/마감일/내용/우선순위]` JSON 추출 프롬프트 설계.
  - [ ] 태스크 도출 시 연계될 개별 기능 검수(QA) 체크리스트 요건을 한 쌍으로 추론하는 프롬프트 최적화.
  - [ ] 기존 스펙(`API_SPECIFICATION.md`, `DB_SCHEMA.md`) 문서와의 논리 상충 감지 및 분석 사유 도출 로직.
- [ ] **2.3 스케줄 생성 및 QA 벌크 매핑 저장 구현 (`routers/schedules.py`):**
  - [ ] `POST /api/v1/schedules/generate` 엔드포인트 구현 (JWT 인증, PM 전용 가드 적용).
  - [ ] 파싱 실패 시 `400 Bad Request` 에러 응답 처리.
  - [ ] **[QA 벌크 매핑 고도화]** 도출된 일정 일괄 저장 시, 생성된 `KanbanTicket` ID와 연동된 `qa_inspection_items`를 DB 트랜잭션 하에서 1:N으로 정확하게 연결하여 벌크 인서트(Bulk Insert)하는 로직 구현.
- [ ] **2.4 논리 상충 감지 시 예외 경고 티켓 삽입:**
  - [ ] 상충이 있는 경우 `status=TO_REVIEW`, `title`에 `[AI-Detected]` 접두어를 가지는 경고 티켓 자동 삽입.
- [ ] **2.5 Slack 단방향 알림 트리거 구현 (`slack_utils.py`):**
  - [ ] DB(`project_settings`)에서 `slack_webhook_url` 값을 읽어와 실시간 웹훅을 전송하는 모듈 구현.
  - [ ] AI 상충 경고 카드 인서트 시 슬랙 알림 발송 연동.

---

## 📅 마일스톤 3: 칸반보드 검색/필터 및 품질 검수 하드 게이트 API

- [ ] **3.1 칸반보드 티켓 조회 API 구현 (`routers/tickets.py`):**
  - [ ] **[검색 및 필터 고도화]** 키워드 검색(`search`), 담당자(`assignee_id`), 우선순위(`priority` [P0, P1, P2]) 필터링 쿼리 파라미터를 지원하는 `GET /api/v1/tickets` 엔드포인트 구현 (JWT 인증 적용).
  - [ ] 상세 연계 QA 리스트를 동반하는 `GET /api/v1/tickets/{ticket_id}` 엔드포인트 구현.
- [ ] **3.2 티켓 상태/정보 수정 API 구현 (`routers/tickets.py`):**
  - [ ] `PATCH /api/v1/tickets/{ticket_id}` 엔드포인트 구현 (일정, 우선순위, 해결방안 임시저장 지원).
  - [ ] JWT 토큰이 없거나 만료된 요청에 대해 `401 Unauthorized` 반환 처리.
- [ ] **3.3 티켓 수정 역할 기반 권한 제어(RBAC) 검증:**
  - [ ] `assignee_id` 변경 시 요청자 역할이 `PM`인지 검증 (`403 Forbidden` 처리).
  - [ ] 상태 및 일정 변경 시 해당 티켓 담당자(assignee)이거나 `PM` 권한을 가진 사용자인지 검증 (`403 Forbidden` 처리).
- [ ] **3.4 해결 완료 처리 및 백엔드 하드 게이트 검증 (`routers/tickets.py`):**
  - [ ] `POST /api/v1/tickets/{ticket_id}/resolve` 엔드포인트 구현 (또는 `PATCH`를 통한 완료 처리).
  - [ ] **[QA 하드 게이트 고도화]** 해당 티켓에 연결된 모든 `qa_inspection_items`의 상태가 `PASS`가 아닌 경우, `400 Bad Request` 예외(에러 메시지 상세)를 반환하고 처리를 거부하는 검증 로직 구현.
- [ ] **3.5 기능 및 품질 검수 명세서 API 구현 (`routers/qa.py`):**
  - [ ] `GET /api/v1/qa/items` (카테고리/티켓별 조회) 및 `PATCH /api/v1/qa/items/{item_id}` (Pass/Fail/Untested 토글) 구현.
- [ ] **3.6 프로젝트 전역 설정 관리 API 구현 (`routers/settings.py`):**
  - [ ] **[슬랙 UI 백엔드]** `PATCH /api/v1/settings/{key}` 엔드포인트 구현 (JWT 인증, PM 전용 권한 제한)을 통해 슬랙 웹훅 URL 동적 수정 및 갱신 지원.

---

## 📅 마일스톤 4: 프론트엔드 UI 및 5대 고도화 사항 연동 (React)

- [ ] **4.1 프로젝트 초기 보일러플레이트 및 HTTP 모듈 설정:**
  - [ ] React SPA 프로젝트 구조 수립 및 Tailwind CSS/Vanilla CSS 설정.
  - [ ] 전역 `axios` 인스턴스 설계 및 응답 인터셉터 구현 (토큰 만료 `401 Unauthorized` 에러 시 로그아웃 리다이렉트).
- [ ] **4.2 로그인/회원가입 및 세션 관리 UI (인증 고도화):**
  - [ ] 로그인 및 회원가입 페이지 구현.
  - [ ] 헤더 영역에 현재 로그인 사용자의 실명과 역할을 표시하고 클라이언트 세션 토큰을 삭제하는 **로그아웃(Logout)** 기능 연동.
- [ ] **4.3 파일 업로드 및 분석 트리거 UI:**
  - [ ] 기획서 및 기능명세서 파일 드롭다운 업로드 영역 구현.
  - [ ] 분석 호출 시 로딩 스피너 및 에러 팝업 렌더링.
- [ ] **4.4 대시보드 네비게이션 및 컨트롤 바 구현 (검색 & 필터):**
  - [ ] 5대 탭(일정, 칸반, 기능검수, 품질검수, 설정) 메뉴 구성.
  - [ ] **[검색 및 필터 UI]** 칸반보드 뷰 상단에 실시간 키워드 검색바, '내 작업만 보기' 토글, 우선순위(P0/P1/P2) 필터링 드롭다운 UI 구현.
- [ ] **4.5 우선순위 배지가 포함된 4열 칸반보드 구현:**
  - [ ] `TO_DO`, `TO_REVIEW`, `IN_PROGRESS`, `DONE` 컬럼 렌더링.
  - [ ] **[배지 UI 고도화]** 마감일 임박(3일 이내) 시 빨간색 애니메이션 펄스 효과를 주는 D-Day 배지 컴포넌트 구현.
  - [ ] 카드 내부에 우선순위 칩(P0/P1/P2) 노출.
  - [ ] `[AI-Detected]` 카드는 🤖 아이콘과 그라데이션 보더 라인으로 시각화.
- [ ] **4.6 드래그 앤 드롭 카드 이동 기능 연동:**
  - [ ] 카드 드롭 이벤트 발생 시 `PATCH /api/v1/tickets/{ticket_id}` API 연동 및 UI 상태 업데이트 (RBAC 권한에 따른 에러 토스트 대응).
- [ ] **4.7 상세 및 품질 검수 모달창 구현 (하드 게이트 컴포넌트):**
  - [ ] 칸반 카드 선택 시 상세 정보 모달창 오픈.
  - [ ] 담당자 배정(가입자 `/users` 연동) 및 시작/마감일, 우선순위, 해결방안 텍스트 영역 렌더링.
  - [ ] 해결방안 작성 내용 수시 저장을 위한 `[해결 방안 임시저장]` 버튼 API 연동.
- [ ] **4.8 모달창 하단 검수 체크리스트 및 완료 제어 로직 구현 (하드 게이트):**
  - [ ] 티켓에 매핑되어 서버에서 받아온 QA 검수 아이템 리스트 동적 렌더링.
  - [ ] 체크박스 체크 시 토글 API(`PATCH /api/v1/qa/items/{item_id}`) 호출 및 `qaItems` State 동기화.
  - [ ] **[프론트엔드 하드 게이트]** 불러온 모든 검수 아이템이 `PASS`가 아니면 완료 버튼을 비활성화(`disabled`) 처리하고 금지 커서 표시.
  - [ ] 백엔드 예외 메시지(`400 Bad Request`) 발생 시 모달 하단에 에러 경고 텍스트 출력.
- [ ] **4.9 설정 관리(Settings) 및 검수서 화면 구현 (슬랙 UI):**
  - [ ] **[슬랙 UI 고도화]** 설정 탭 선택 시 수신 슬랙 웹훅 URL 수정 및 갱신 API 연동 UI 제공 (PM 권한 검증 및 에러 대응).
  - [ ] 기능/품질 검수 탭 화면에서 수동 검수 관리 및 상태 변경 기능 구현.

---

## 📅 마일스톤 5: 테스트 작성 및 최종 QA 검증 (Test & QA)

- [ ] **5.1 백엔드 자동화 단위 테스트 구현 (`plans/qa_test_specification.md` 연계):**
  - [ ] **인증 및 권한 테스트 (`tests/test_auth.py`):** 사용자 가입/로그인 및 JWT 토큰 인증 테스트, 역할 기반 권한 제어(RBAC - 일반 개발자의 타인 티켓 배정 변경 시도 및 설정 수정 시 `403 Forbidden` 반환 검증).
  - [ ] **스케줄 및 알림 테스트 (`tests/test_schedule.py`):** WBS 일정 일괄 생성, 파싱 에러 대응, AI 상충 감지 시 `To Review` 티켓 발행 및 슬랙 웹훅 알림 전송 연동 테스트.
  - [ ] **티켓 및 검색 필터 테스트 (`tests/test_tickets.py`):** 티켓 조회 시 키워드 검색, 담당자 및 우선순위 필터링 API 테스트.
  - [ ] **하드 게이트 검증 테스트 (`tests/test_hard_gate.py`):** 티켓을 완료 처리(`Done`)할 때 연결된 모든 QA 항목이 `PASS`가 아니면 `400 Bad Request` 예외를 내며 완료를 거부하는 백엔드 차단 테스트.
- [ ] **5.2 수동 인수 테스트 시나리오 검증 수행:**
  - [ ] **[TC-1]** 명세 파일 업로드 및 일정 일괄 생성(WBS & QA 1:N 자동 매핑) 동작 검증.
  - [ ] **[TC-2]** AI 상충 감지 시 `To Review` 티켓 발행 및 슬랙 수신 검증.
  - [ ] **[TC-3]** 키워드 검색바, 담당자/우선순위 필터링 및 D-Day 배지 렌더링 검증.
  - [ ] **[TC-4]** 일반 개발자의 권한 밖 수정 시 `403 Forbidden` 차단 권한 검증.
  - [ ] **[TC-5]** 상세 모달 내 체크리스트 변경에 따른 하드 게이트 버튼 활성/비활성 제어 및 백엔드 에러 출력 검증.
  - [ ] **[TC-6]** 설정 탭에서의 슬랙 웹훅 URL 변경 및 실시간 수신처 변경 검증.
  - [ ] **[TC-7]** 로그아웃 시 토큰 파기 및 세션 만료 검증.
