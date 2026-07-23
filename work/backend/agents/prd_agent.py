import llm_service


class PrdAgent:
    """
    프로젝트 제목 한 줄만으로 초안 요구명세서(PRD)를 자동 작성하는 단일 책임 에이전트.
    """

    def run(self, project_name: str) -> str:
        return llm_service.generate_prd_draft(project_name=project_name)


prd_agent = PrdAgent()
