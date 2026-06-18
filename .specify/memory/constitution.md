# 프로젝트 헌법 (Constitution)

이 문서는 프로젝트의 핵심 원칙, 기술 스택, 코딩 규칙 및 아키텍처 제약 조건을 정의합니다. 모든 사양(Specs), 계획(Plans), 태스크(Tasks), 구현된 코드는 이 헌법에 명시된 원칙을 준수해야 합니다.

---

## 🏛️ 핵심 개발 원칙 (Core Principles)

1.  **단순성 우선 (Simplicity First):** 과도한 엔지니어링을 피하고 직관적이며 간결한 코드를 작성합니다.
2.  **명세 기반 개발 (Spec-Driven):** 코드를 작성하기 전에 반드시 명세서와 계획서를 먼저 논의하고 승인받습니다.
3.  **철저한 문서화 (Documentation):** 새로운 기능이나 인터페이스는 주석과 관련 문서를 최신 상태로 유지합니다.

---

## 🛠️ 기술 스택 및 제약 조건 (Tech Stack & Constraints)

*   **언어 및 실행 환경:** Python 3.10+ (가상환경 `.venv`) / Node.js v18+ (Vite)
*   **백엔드 기술 스택:**
    *   **프레임워크**: FastAPI
    *   **웹 서버**: Uvicorn
    *   **ORM 및 DB**: SQLAlchemy (SQLite `ai_pm.db` 연결, 외래키 `PRAGMA foreign_keys=ON` 강제 활성화 및 CASCADE 연동)
    *   **보안 및 인증**: PyJWT (JWT 토큰 발급 및 파싱), bcrypt (비밀번호 단방향 해싱), python-multipart (OAuth2 패스워드 폼 대응)
    *   **AI 인터페이스**: LangChain (OpenAI `gpt-4o-mini` 및 Gemini API 연동 대응)
*   **프론트엔드 기술 스택:**
    *   **프레임워크**: React + TypeScript (Vite v5 번들러)
    *   **스타일링**: Tailwind CSS v3 (프리미엄 다크 테마 커스텀)
    *   **HTTP 모듈**: Axios (API 호출 및 `401 Unauthorized` 자동 토큰 파기/로그인 리다이렉트 인터셉터 탑재)
    *   **라우팅**: React Router DOM (경로 기반 뷰 스위칭)
*   **프로젝트 소스 코드 구조:**
    *   모든 프론트엔드 소스 코드는 [work/frontend](file:///c:/작업실/2026/KOSA_Agent/anrigravity_test/work/frontend) 폴더에 배치합니다.
    *   모든 백엔드 소스 코드는 [work/backend](file:///c:/작업실/2026/KOSA_Agent/anrigravity_test/work/backend) 폴더에 배치합니다.


---

## 🎨 코딩 표준 및 코드 포맷 (Coding Standards)

*   **스타일 가이드:** PEP 8 (Python Style Guide)을 엄격히 준수합니다.
*   **타입 어노테이션:** 파이썬 코드 작성 시 모든 함수의 매개변수와 반환값 타입 힌트를 명시합니다.
*   **클래스 및 함수 명명 규칙:**
    *   클래스: `PascalCase`
    *   함수 및 변수: `snake_case`
    *   상수: `UPPER_SNAKE_CASE`

---

## 🧪 테스트 및 품질 보증 (Testing & QA)

*   모든 핵심 로직 및 유틸리티 함수는 단위 테스트(Unit Test)를 작성해야 합니다.
*   코드 변경 후 기존 테스트가 깨지지 않는지 반드시 로컬에서 검증해야 합니다.
