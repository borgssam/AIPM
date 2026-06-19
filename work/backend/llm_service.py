import os
import json
from datetime import datetime
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

# 루트 폴더의 .env 로드
dotenv_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
load_dotenv(dotenv_path)

def analyze_specifications(
    prd_content: str, 
    spec_content: str, 
    existing_api_spec: str = "", 
    existing_db_schema: str = ""
) -> dict:
    """
    요구명세서(PRD)와 기능명세서(Spec)를 분석하여 개발 WBS 일정(KanbanTicket) 및 연계 QA 항목(QAInspectionItem)을 도출합니다.
    동시에 기존 API 명세나 DB 스키마 등과의 기획적/구조적 논리 상충을 추론하여 [AI-Detected] 경고 티켓 목록을 작성합니다.
    """
    openai_key = os.getenv("OPENAI_API_KEY")
    gemini_key = os.getenv("GEMINI_API_KEY")
    
    # 1. 사용할 LLM 모델 설정 (OpenAI를 기본으로 삼되 Gemini API도 백업 대응 가능하도록 설계)
    if openai_key:
        llm = ChatOpenAI(
            model="gpt-4o-mini",
            api_key=openai_key,
            temperature=0.1,
            model_kwargs={"response_format": {"type": "json_object"}}
        )
    elif gemini_key:
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            llm = ChatGoogleGenerativeAI(
                model="gemini-1.5-flash",
                google_api_key=gemini_key,
                temperature=0.1,
                response_format={"type": "json_object"}
            )
        except ImportError:
            # langchain-google-genai 패키지가 누락된 경우, OpenAI SDK 호환 형식의 Gemini API 엔드포인트 바인딩
            llm = ChatOpenAI(
                model="gemini-1.5-flash",
                api_key=gemini_key,
                base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
                temperature=0.1,
                model_kwargs={"response_format": {"type": "json_object"}}
            )
    else:
        raise ValueError("Neither OPENAI_API_KEY nor GEMINI_API_KEY is configured in the environment.")

    # 날짜 자동 산정 기준 제공을 위해 오늘 날짜 취득
    today_str = datetime.today().strftime('%Y-%m-%d')

    # LangChain PromptTemplate 파싱 에러를 피하기 위해 f-string과 JSON 형식을 분리하여 구성
    system_prompt = f"""
당신은 전문 AI 프로젝트 매니저(AI PM)입니다. 역할은 제공된 프로젝트 문서(PRD 및 기능 명세서)를 분석하여 높은 수준의 작업 일정인 에픽(Epic) 일정들을 도출하고, 감지된 논리적 상충 오류를 식별하는 것입니다.

오늘 날짜: {today_str}

## 중요 지침:
1. **언어 제약 조건 (가장 중요 - 절대 규칙)**:
   - **입력 문서(PRD, 기능 명세서, API 명세, DB 스키마 등)가 영어로 작성되어 있더라도, 출력되는 JSON의 모든 텍스트 필드(`title`, `description`, 상충 오류의 `title` 및 `description`)는 무조건 완전하고 자연스러운 한국어(한글)로 번역 및 작성해야 합니다.** 영어 단어의 한국어 음독 표현(예: "API 구현")은 허용되나, 문장은 완전한 한국어 서술이어야 합니다. 영어로 답변이 나갈 경우 시스템 에러로 간주됩니다.
2. **에픽 및 일정 도출 (Epic Breakdown)**:
   - 기획서에서 전체 일정을 관리할 대기능 단위의 **에픽(Epic)**들을 도출합니다. (세부 칸반 티켓이나 검수 항목은 정의하지 않습니다.)
   - 각 에픽은 다음 필드를 필수 포함해야 합니다: `title`(에픽 명칭), `description`(해당 에픽의 작업 범위 및 개요), `start_date`(시작 예정일, YYYY-MM-DD 형식, 오늘 날짜({today_str}) 이후여야 함), `due_date`(마감 예정일, YYYY-MM-DD 형식, 시작일보다 크거나 같아야 함).
3. **상충 감지 (Conflict Detection)**:
   - 입력된 PRD와 기능 명세서를 분석하여 서로 간의 논리적 모순, 누락된 스코프, 타입 불일치, 불가능한 일정 등을 찾아냅니다. 기존 API 명세(`existing_api_spec`)나 DB 스키마(`existing_db_schema`)가 제공된 경우 이들과도 비교 분석합니다.
   - 상충 오류가 감지되면 다음 형식의 특별 경고 에픽을 생성합니다:
     - `title`: 반드시 "[AI-Detected]"로 시작해야 합니다 (예: "[AI-Detected] API URL 경로 불일치").
     - `description`: 상충되는 항목에 대한 구체적인 분석 설명과 검토 의견을 한국어로 상세히 작성합니다.
     - `start_date` 및 `due_date`: 오늘 날짜 또는 즉시 처리해야 하는 일정으로 설정합니다.
     - 이 경고 에픽은 응답 내 `conflicts` 리스트에 담아 반환합니다.

## 출력 JSON 구조 (반드시 이 형식을 준수하고, 텍스트는 100% 한국어로 채우십시오):
{{
  "epics": [
    {{
      "title": "사용자 회원가입 및 인증 체계 구축",
      "description": "FastAPI 백엔드의 인증 라우터 설계 및 React 로그인/회원가입 UI 연동 일정",
      "start_date": "2026-06-19",
      "due_date": "2026-06-25"
    }}
  ],
  "conflicts": [
    {{
      "title": "[AI-Detected] 사용자 역할 정의 불일치 상충",
      "description": "상충 감지: PRD 기획서에는 '어드민'과 '일반' 역할이 정의되어 있으나, 기능명세서에는 'PM', '개발자', '디자이너', 'QA'로 정의되어 있습니다. 공식 역할 정의에 대한 합의 및 검토가 필요합니다.",
      "start_date": "2026-06-18",
      "due_date": "2026-06-18"
    }}
  ]
}}
"""

    human_prompt = f"""
### 입력 PRD (제품 요구사항 정의서):
{prd_content}

### 입력 기능 명세서 (Functional Specification):
{spec_content}

### 기존 API 명세서 (선택 사항):
{existing_api_spec}

### 기존 DB 스키마 (선택 사항):
{existing_db_schema}
"""

    # SystemMessage와 HumanMessage를 사용하여 프롬프트 템플릿의 파싱 해석 과정을 우회함
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=human_prompt)
    ]

    # === [디버깅 로그] LLM 요청 프롬프트 콘솔 출력 ===
    print("\n" + "=" * 50 + " [LLM REQUEST PROMPT] " + "=" * 50)
    print(f"[SYSTEM PROMPT]\n{system_prompt}")
    print(f"[HUMAN PROMPT]\n{human_prompt}")
    print("=" * 122 + "\n")

    response = llm.invoke(messages)

    # === [디버깅 로그] LLM 응답 결과 콘솔 출력 ===
    print("\n" + "=" * 50 + " [LLM RESPONSE RAW CONTENT] " + "=" * 50)
    print(response.content)
    print("=" * 128 + "\n")


    # JSON 결과 파싱 및 방어 코드
    try:
        result_dict = json.loads(response.content)
        return result_dict
    except Exception as e:
        content = response.content.strip()
        if content.startswith("```json"):
            content = content[7:]
        if content.endswith("```"):
            content = content[:-3]
        try:
            return json.loads(content.strip())
        except Exception as inner_e:
            raise ValueError(f"Failed to parse LLM response as JSON: {inner_e}. Raw content: {response.content}")

def recommend_epic_tickets(
    prd_content: str,
    spec_content: str,
    epic_title: str,
    epic_description: str = "",
    existing_tickets: list = None
) -> dict:
    """
    에픽 정보, 요구명세서(PRD) 및 기능명세서(Spec)를 바탕으로 세부 칸반 티켓 및 QA 검수 항목을 추천합니다.
    기존 티켓 정보(existing_tickets)가 주어지면 중복되지 않는 새로운 세부 할일을 도출합니다.
    """
    openai_key = os.getenv("OPENAI_API_KEY")
    gemini_key = os.getenv("GEMINI_API_KEY")
    
    # 사용할 LLM 모델 설정
    if openai_key:
        llm = ChatOpenAI(
            model="gpt-4o-mini",
            api_key=openai_key,
            temperature=0.2,
            model_kwargs={"response_format": {"type": "json_object"}}
        )
    elif gemini_key:
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            llm = ChatGoogleGenerativeAI(
                model="gemini-1.5-flash",
                google_api_key=gemini_key,
                temperature=0.2,
                response_format={"type": "json_object"}
            )
        except ImportError:
            llm = ChatOpenAI(
                model="gemini-1.5-flash",
                api_key=gemini_key,
                base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
                temperature=0.2,
                model_kwargs={"response_format": {"type": "json_object"}}
            )
    else:
        raise ValueError("Neither OPENAI_API_KEY nor GEMINI_API_KEY is configured in the environment.")

    today_str = datetime.today().strftime('%Y-%m-%d')
    existing_tickets_str = ", ".join(existing_tickets) if existing_tickets else "없음"

    system_prompt = f"""
당신은 전문 AI 프로젝트 매니저(AI PM)입니다.
역할은 제공된 프로젝트 요구명세서(PRD), 기능명세서(Spec) 및 선택된 에픽(Epic)의 정보를 바탕으로, 해당 에픽을 완수하기 위해 필요한 구체적이고 실행 가능한 세부 개발 할일(칸반 티켓)들을 추천하는 것입니다.

오늘 날짜: {today_str}

## 중요 지침:
1. **언어 제약 조건 (가장 중요 - 절대 규칙)**:
   - **출력되는 JSON의 모든 텍스트 필드(`title`, `description`, `functional_qa_title`, `quality_qa_title`)는 무조건 완전하고 자연스러운 한국어(한글)로 작성해야 합니다.** 영어로 답변이 나갈 경우 시스템 에러로 간주됩니다.
2. **할 일 도출**:
   - 선택된 에픽("{epic_title}" - 설명: {epic_description}) 범주 내에서 수행해야 할 실무 세부 작업들을 칸반 티켓 형태로 3~5개 도출합니다.
   - 각 추천 티켓은 다음 필드를 포함해야 합니다:
     - `title`: 할 일의 직관적이고 명확한 한글 제목
     - `description`: 무엇을 어떻게 작업해야 하는지 한글로 상세 설명
     - `priority`: 우선순위 (`P0`[긴급/블로커], `P1`[보통], `P2`[낮음] 중 하나)
     - `need_functional_qa`: 해당 할 일에 대해 기능 테스트(검수)가 필요한지 여부 (true/false)
     - `functional_qa_title`: 기능 검수 요건 (need_functional_qa가 true인 경우, 검증해야 할 비즈니스 규칙 및 동작을 한국어로 기술)
     - `need_quality_qa`: 해당 할 일에 대해 품질 테스트(성능, 보안, UI 완성도 등)가 필요한지 여부 (true/false)
     - `quality_qa_title`: 품질 검수 요건 (need_quality_qa가 true인 경우, 검증해야 할 성능/보안/규격 품질 요소를 한국어로 기술)
3. **중복 제외 규칙**:
   - 기존에 이미 등록된 할 일 목록(기존 할 일: {existing_tickets_str})이 제공된 경우, 이들과 유사하거나 동일한 작업은 추천에서 제외하여 완전히 새로운 세부 작업을 도출해야 합니다.

## 출력 JSON 구조 (반드시 이 형식을 준수하고, 텍스트는 100% 한국어로 채우십시오):
{{
  "recommendations": [
    {{
      "title": "로그인 페이지 컴포넌트 구현",
      "description": "회원 인증 에픽을 위해 로그인 화면 폼 UI 구현 및 디자인 가이드 반영",
      "priority": "P1",
      "need_functional_qa": true,
      "functional_qa_title": "아이디/비밀번호 미입력 시 에러 메시지가 표시되는지 확인",
      "need_quality_qa": false,
      "quality_qa_title": ""
    }}
  ]
}}
"""

    human_prompt = f"""
### 입력 PRD (제품 요구사항 정의서):
{prd_content}

### 입력 기능 명세서 (Functional Specification):
{spec_content}

### 대상 에픽 정보:
- 제목: {epic_title}
- 설명: {epic_description}

### 기존 등록된 할 일 목록 (중복 및 유사 항목 추천 제외 대상):
{existing_tickets_str}
"""

    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=human_prompt)
    ]

    # 디버깅 로그 출력
    print("\n" + "=" * 50 + " [LLM RECOMMENDATION REQUEST PROMPT] " + "=" * 50)
    print(f"[SYSTEM PROMPT]\n{system_prompt}")
    print(f"[HUMAN PROMPT]\n{human_prompt}")
    print("=" * 122 + "\n")

    response = llm.invoke(messages)

    print("\n" + "=" * 50 + " [LLM RECOMMENDATION RESPONSE RAW CONTENT] " + "=" * 50)
    print(response.content)
    print("=" * 128 + "\n")

    try:
        result_dict = json.loads(response.content)
        return result_dict
    except Exception as e:
        content = response.content.strip()
        if content.startswith("```json"):
            content = content[7:]
        if content.endswith("```"):
            content = content[:-3]
        try:
            return json.loads(content.strip())
        except Exception as inner_e:
            raise ValueError(f"Failed to parse LLM response as JSON: {inner_e}. Raw content: {response.content}")

