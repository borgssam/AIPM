# Spec Kit (스팩킷) 작업지시서 작성 워크스페이스

이 폴더는 **Spec-Driven Development (명세 기반 개발, SDD)** 방법론을 활용하여 AI 에이전트와 협업하기 위한 작업 공간입니다.  
사전 정의된 템플릿을 통해 명세(Specification), 개발 계획(Plan), 상세 태스크(Tasks)를 구조화하여 작성하고 관리할 수 있습니다.

---

## 📂 폴더 구조 (Directory Structure)

```text
anrigravity_test/
├── .venv/                      # 파이썬 가상환경 (활성화 상태)
├── .specify/                   # Spec Kit 설정 및 메모리 폴더
│   ├── memory/
│   │   └── constitution.md     # 프로젝트 헌법 (개발 원칙, 컨벤션, 기술 스택 정의)
│   └── templates/
│       ├── spec-template.md    # 1단계: 기능 명세서(작업지시서) 템플릿
│       ├── plan-template.md    # 2단계: 개발 구현 계획서 템플릿
│       └── tasks-template.md   # 3단계: 상세 구현 태스크 템플릿
├── work/                       # 실제 프로젝트 소스 코드 폴더
│   ├── frontend/               # 프론트엔드 소스 코드
│   └── backend/                # 백엔드 소스 코드
├── specs/                      # [작성용] 기능 명세서(작업지시서) 저장 폴더
├── plans/                      # [작성용] 개발 구현 계획서 저장 폴더
├── tasks/                      # [작성용] 상세 구현 태스크 저장 폴더
└── README.md                   # 본 가이드 문서
```


---

## 🚀 SDD (명세 기반 개발) 워크플로우

AI 에이전트와 개발을 진행할 때 다음 **3단계 순서**로 문서를 작성하여 지시하세요.

### **1단계: 명세서 작성 (`specs/`)**
*   `specs/` 폴더에 구현하고자 하는 기능의 명세서를 작성합니다.
*   `.specify/templates/spec-template.md` 파일을 복사하여 작성하세요.
*   **목적:** AI에게 "무엇(What)"을 "왜(Why)" 만들어야 하는지 기능적/비기능적 요구사항을 설명합니다.

### **2단계: 구현 계획 수립 (`plans/`)**
*   명세서를 기반으로 `plans/` 폴더에 기술 설계 및 파일 변경 계획을 수립합니다.
*   `.specify/templates/plan-template.md` 파일을 복사하여 작성하세요.
*   **목적:** AI에게 "어떻게(How)" 코드를 짤 것인지 구체적인 기술 스택, 아키텍처, 수정할 파일 경로를 제안하고 검토받습니다.

### **3단계: 태스크 분할 및 구현 (`tasks/`)**
*   계획서가 최종 확정되면 `tasks/` 폴더에 태스크 체크리스트를 생성합니다.
*   `.specify/templates/tasks-template.md` 파일을 복사하여 작성하세요.
*   **목적:** 한 단계씩 완료 여부(`[ ]` -> `[x]`)를 기록하며 작업을 실행합니다.

---

## 🛠️ Spec Kit 기본 CLI 도구 사용법

이 워크스페이스는 기본적으로 수동 템플릿 작성용으로 구성되어 있지만, 공식 `specify-cli` 도구를 설치하여 사용할 수도 있습니다.

1.  **가상환경 활성화 (Powershell):**
    ```powershell
    .\.venv\Scripts\Activate.ps1
    ```
2.  **`specify-cli` 설치:**
    ```powershell
    pip install git+https://github.com/github/spec-kit.git
    ```
3.  **프로젝트 초기화 (선택사항):**
    ```powershell
    specify init <프로젝트명> --integration <에이전트명: gemini | claude | copilot>
    ```
