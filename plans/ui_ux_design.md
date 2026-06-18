# UI/UX 화면 설계서 (UI & UX Design Plan)

본 문서는 `specs/ai_pm_spec.md` 요구사항 및 `plans/db_and_api_design.md` 설계를 기반으로 하는 **AI PM Phase 1**의 프론트엔드 UI/UX 설계안입니다. React와 Tailwind CSS로 구현 시 레이아웃 깨짐이나 기획상의 오차 없이 일관되게 코딩할 수 있도록 와이어프레임 텍스트 아트 및 컴포넌트 계층, State 구조를 명시합니다. 

특히 이번 업데이트를 통해 **세션 로그아웃, 태스크 우선순위 필터, 프로젝트 설정 관리(슬랙), 실시간 검색 및 백엔드 예외 메시지 연동 로직**이 상세 보완되었습니다.

---

## 1. 와이어프레임 설계 (UI Wireframes)

### 1.1 메인 대시보드 및 상단 컨트롤 바
대시보드 상단에는 로그인된 사용자 정보와 로그아웃 버튼이 노출되며, 파일 업로드 영역과 함께 카드를 탐색할 수 있는 통합 검색 및 필터링 기능이 제공됩니다.

```
+---------------------------------------------------------------------------------------------------+
|  🤖 AI PM 협업 대시보드 (AI Project Manager Board)                      [ 박피엠 (PM) | 로그아웃 ] |
+---------------------------------------------------------------------------------------------------+
|  [1] 명세서 파일 업로드 영역 (PRD & Spec File Uploader)                                             |
|  +---------------------------------------------------------------------------------------------+  |
|  |  요구명세서 (PRD)                                |  기능명세서 (Spec)                               |  |
|  |  +-------------------------------------------+  |  +-------------------------------------------+  |  |
|  |  | [ 드래그 앤 드롭 또는 파일 선택 (.md) ]     |  |  | [ 드래그 앤 드롭 또는 파일 선택 (.md) ]     |  |  |
|  |  | 선택된 파일: prd_requirement_v1.md        |  |  | 선택된 파일: spec_design_v1.md            |  |  |
|  |  +-------------------------------------------+  |  +-------------------------------------------+  |  |
|  +---------------------------------------------------------------------------------------------+  |
|  |                                  [ 🚀 개발 스케줄 생성 및 상충 분석 ]                                |  |
|  +---------------------------------------------------------------------------------------------+  |
+---------------------------------------------------------------------------------------------------+
|  탭 메뉴:  [ 일정관리 (Gantt) ]  |  [* 칸반보드 (Kanban) *]  |  [ 기능검수명세서 ]  |  [ 품질검수명세서 ]  |  [ 설정 ] |
+---------------------------------------------------------------------------------------------------+
|  [컨트롤 바]  검색: [ 로그인 기능 검출...     ]   [X] 내 작업만 보기    우선순위: [ 전체 / P0 / P1 / P2 v ] |
+---------------------------------------------------------------------------------------------------+
```

### 1.2 [메인 칸반보드 뷰] 와이어프레임
칸반보드는 4열 구조(`To Do`, `To Review`, `In Progress`, `Done`)로 설계되며, 카드 내부에 시작일, 마감일 정보와 함께 우선순위 칩 및 D-Day 배지가 포함됩니다.

```
+---------------------------------------------------------------------------------------------------+
|  [2] 칸반보드 영역 (Kanban Board View)                                                             |
|                                                                                                   |
|  +-------------------+  +-------------------+  +-------------------+  +-------------------+      |
|  | To Do (해야 할 일) |  | To Review(검토필요)|  | In Progress (진행)|  | Done (완료)       |      |
|  +-------------------+  +-------------------+  +-------------------+  +-------------------+      |
|  | [Card #101]       |  | [Card #102]       |  | [Card #103]       |  | [Card #104]       |      |
|  | 로그인 UI 개발    |  | [AI-Detected]     |  | DB 마이그레이션   |  | 프로젝트 환경설정 |      |
|  |                   |  | API 스펙 논리충돌 |  |                   |  |                   |      |
|  | 배정: 김개발      |  | 배정: 미지정      |  | 배정: 이개발      |  | 배정: 박피엠      |      |
|  | 06-18 ~ 06-22     |  | 06-18 ~ 06-20     |  | 06-19 ~ 06-24     |  | 06-17 ~ 06-18     |      |
|  | [P1] [D-4]        |  | [P0] [D-2] [🤖]   |  | [P1] [D-6]        |  | [P2] [완료]       |      |
|  +-------------------+  +-------------------+  +-------------------+  +-------------------+      |
+---------------------------------------------------------------------------------------------------+
```

### 1.3 [설정 탭 뷰] 와이어프레임
PM 권한을 가진 사용자가 슬랙 알림 웹훅 등의 인프라 요소를 실시간으로 변경할 수 있는 전용 설정 탭 뷰 화면입니다.

```
+---------------------------------------------------------------------------------------------------+
|  [3] 프로젝트 전역 설정 관리 (Project Settings View)                                               |
|                                                                                                   |
|  * 슬랙 웹훅 설정 (Slack Incoming Webhook Configuration)                                          |
|    수신 채널: [ #project-ai-pm-alerts ]                                                           |
|    웹훅 URL:  [ https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX  ] |
|                                                                                                   |
|    +-------------------------------------------------------------------------------------------+  |
|    | [ 💾 설정 저장 ]  (PM 권한을 소유한 관리자만 저장 버튼이 노출되거나 활성화됩니다.)             |
|    +-------------------------------------------------------------------------------------------+  |
+---------------------------------------------------------------------------------------------------+
```

### 1.4 [티켓 상세 및 품질 검수 모달 뷰] 와이어프레임
카드를 클릭했을 때 열리는 팝업 모달창입니다. 임시 저장을 위한 해결 방안 작성 영역, 그리고 **DB 데이터와 동적으로 묶인 검수 체크리스트(하드 게이트)** 및 **예외 메시지 알림 영역**이 포함됩니다.

```
+---------------------------------------------------------------------------------------------------+
|  [상세 모달] 티켓 #102 상세 정보 및 조율                                                      [X]  |
+---------------------------------------------------------------------------------------------------+
|  제목: [AI-Detected] API 스펙 논리충돌 경고                                                        |
|  내용: 요구명세서의 회원가입 email 필수 항목과 DB_SCHEMA.md의 email 컬럼 누락이 모순됩니다.          |
|  우선순위: [ P0 v ]  |  시작일: [ 2026-06-18 ] ~ 마감일: [ 2026-06-20 ]                             |
|                                                                                                   |
|  +---------------------------------------------------------------------------------------------+  |
|  |  * 담당자 지정 (Assignee) : [ 드롭다운: 김개발 (Developer) v ]                               |  |
|  +---------------------------------------------------------------------------------------------+  |
|  |  * 해결 방안 (Resolution) :                                                                  |  |
|  |    +---------------------------------------------------------------------------------------+  |  |
|  |    | DB_SCHEMA.md에 email 필드를 추가하고, API 명세서 버전을 v1.1로 동기화하기로 합의함.     |  |  |
|  |    +---------------------------------------------------------------------------------------+  |  |
|  |    [ 📄 해결 방안 임시저장 ]                                                                |  |
|  +---------------------------------------------------------------------------------------------+  |
|                                                                                                   |
|  * 품질 검수 체크리스트 (QA Checklist) [완료 처리를 위한 하드 게이트 - DB 연동]                         |
|  [X] 1. 요구명세서와 DB 스키마 간의 논리적 충돌을 기술적으로 해결했는가? (status: PASS)          |
|  [X] 2. 변경/조율된 API 명세서 스펙을 동료 개발자에게 전파하고 합의했는가? (status: PASS)        |
|  [X] 3. 작성된 해결 방안이 개발 컨벤션(CONVENTIONS.md)에 위배되지 않는가? (status: PASS)         |
|  [ ] 4. 모바일 반응형 및 UI 디자인 레이아웃에 영향이 없는가? (status: UNTESTED)                  |
|                                                                                                   |
|  +---------------------------------------------------------------------------------------------+  |
|  |  ⚠️ 에러 메시지: 모든 연계 검수 체크리스트 항목이 완료(PASS) 상태여야 완료할 수 있습니다.      |
|  +---------------------------------------------------------------------------------------------+  |
|  |  [ 완료 (Done) ]  <-- 체크리스트가 전부 PASS이고 백엔드 하드 게이트가 충족되면 활성화됩니다.   |
|  +---------------------------------------------------------------------------------------------+  |
+---------------------------------------------------------------------------------------------------+
```

---

## 2. 컴포넌트 계층 구조 (Component Hierarchy)

React 애플리케이션 빌드 시 조립 단위를 최적화하기 위해 다음과 같이 컴포넌트를 설계합니다.

```mermaid
graph TD
    App([App]) --> Navigation([Navigation])
    App --> Login([Login / Register])
    App --> Dashboard([Dashboard Wrapper])
    
    Dashboard --> Uploader([Uploader])
    Dashboard --> ControlBar([ControlBar - Search & Filters])
    Dashboard --> ScheduleTimeline([ScheduleTimeline - Gantt])
    Dashboard --> KanbanBoard([KanbanBoard])
    Dashboard --> QAInspector([QAInspector])
    Dashboard --> ProjectSettings([ProjectSettings])
    
    KanbanBoard --> KanbanColumn([KanbanColumn])
    KanbanColumn --> KanbanCard([KanbanCard])
    
    KanbanCard --> DetailModal([DetailModal])
```

---

## 3. 핵심 State 구조 및 데이터 제어 (State Management)

### 3.1 App (최상위 컨텍스트 및 인증/에러 전역 처리)
```javascript
const [userToken, setUserToken] = useState(localStorage.getItem("token") || null);
const [currentUser, setCurrentUser] = useState(null); // { id, username, name, role }
const [activeTab, setActiveTab] = useState("kanban"); // "timeline", "kanban", "functional_qa", "quality_qa", "settings"
const [tickets, setTickets] = useState([]); // 전체 칸반 티켓 데이터 배열
const [globalError, setGlobalError] = useState(null); // API 통신 에러 스토리지

// JWT 만료 전역 예외 처리 (Axios Response Interceptor 설정)
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      // 401 Unauthorized 감지 시 강제 로그아웃
      localStorage.removeItem("token");
      setUserToken(null);
      setCurrentUser(null);
      setGlobalError("세션이 만료되었습니다. 다시 로그인해 주세요.");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);
```

### 3.3 DetailModal Component State (하드 게이트 및 백엔드 에러 매핑)
모달에서는 로컬 입력 상태와 함께 **해당 티켓과 Foreign Key로 묶여 서버에서 받아온 qa_items** 배열의 상태를 직접 제어합니다.

```javascript
// 티켓 정보 수정 로컬 State
const [assigneeId, setAssigneeId] = useState(ticket.assignee_id);
const [priority, setPriority] = useState(ticket.priority);
const [startDate, setStartDate] = useState(ticket.start_date);
const [dueDate, setDueDate] = useState(ticket.due_date);
const [resolution, setResolution] = useState(ticket.resolution || "");
const [qaItems, setQaItems] = useState(ticket.qa_items || []); // DB 연동 QA 리스트 State
const [errorMessage, setErrorMessage] = useState(""); // 하드 게이트 백엔드 반환 에러 State

// 클라이언트 사이드 하드 게이트 검증 변수
const isAllQAItemsPassed = qaItems.length > 0 && qaItems.every(item => item.status === "PASS");

// 해결 방안 및 우선순위/일정 수동 임시 저장 API 호출 (PATCH)
const handleSaveDraft = async () => {
  try {
    const response = await axios.patch(`/api/v1/tickets/${ticket.id}`, {
      assignee_id: assigneeId,
      priority: priority,
      start_date: startDate,
      due_date: dueDate,
      resolution: resolution
    });
    // 임시 저장 성공 피드백 처리
  } catch (error) {
    setErrorMessage("임시 저장 중 오류가 발생했습니다.");
  }
};

// 개별 QA 항목 Pass/Fail 토글 API 호출
const handleToggleQAItem = async (itemId, currentStatus) => {
  const nextStatus = currentStatus === "PASS" ? "UNTESTED" : "PASS";
  try {
    const response = await axios.patch(`/api/v1/qa/items/${itemId}`, { status: nextStatus });
    // 로컬 qaItems 배열 상태 동기화 업데이트
    setQaItems(prev => prev.map(item => item.id === itemId ? response.data : item));
    setErrorMessage("");
  } catch (err) {
    setErrorMessage("QA 상태 변경 권한이 없습니다.");
  }
};

// 해결 완료 처리 API 호출 (isAllQAItemsPassed가 true일 때만 호출 가능)
const handleResolve = async () => {
  if (!isAllQAItemsPassed) {
    setErrorMessage("모든 검수 체크리스트 항목이 완료(PASS) 상태여야 완료할 수 있습니다.");
    return;
  }
  try {
    const response = await axios.post(`/api/v1/tickets/${ticket.id}/resolve`, { resolution });
    // 완료 성공 시 티켓 리로드 및 모달 닫기
  } catch (error) {
    if (error.response && error.response.status === 400) {
      // 백엔드 하드 게이트 예외 발생 시 에러 메시지 매핑
      setErrorMessage(error.response.data.detail);
    } else {
      setErrorMessage("권한이 없거나 처리 중 예외가 발생했습니다.");
    }
  }
};
```

---

## 4. UI/UX 디자인 디테일 및 효과 (Tailwind CSS)

*   **D-Day 배지 스타일링:** 
    *   `D-Day <= 3` : `bg-red-100 text-red-700 border border-red-300 font-bold animate-pulse`
    *   `D-Day <= 7` : `bg-yellow-100 text-yellow-700`
    *   일반 일정 : `bg-gray-100 text-gray-600`
*   **우선순위(Priority) 배지:**
    *   `P0 (High)`: `bg-red-500 text-white font-semibold rounded-full px-2 py-0.5 text-xs`
    *   `P1 (Medium)`: `bg-orange-400 text-white rounded-full px-2 py-0.5 text-xs`
    *   `P2 (Low)`: `bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 text-xs`
*   **[AI-Detected] 경고 카드:**
    *   `To Review` 열에 생성된 AI 자동 감지 카드는 테두리에 그라데이션(`border-2 border-indigo-500`) 및 상단에 🤖 아이콘이 포함되어 일반 개발 티켓과 시각적으로 명확히 구별되게 디자인합니다.
*   **하드 게이트 비활성화:**
    *   `isAllQAItemsPassed`가 `false`인 경우: 완료 버튼은 `bg-gray-300 text-gray-500 cursor-not-allowed` 처리하여 클릭을 완전히 차단합니다.
    *   `isAllQAItemsPassed`가 `true`인 경우: `bg-green-600 hover:bg-green-700 text-white shadow-lg transform transition active:scale-95` 효과를 부여해 직관적인 피드백을 선사합니다.
