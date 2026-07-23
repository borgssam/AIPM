import llm_service


class SpecAgent:
    """
    프로젝트 제목과 요구명세서(PRD)를 바탕으로 초안 기능명세서(Functional Specification)를
    자동 작성하는 단일 책임 에이전트.
    """

    def run(self, project_name: str, prd_content: str) -> str:
        return llm_service.generate_spec_draft(project_name=project_name, prd_content=prd_content)


spec_agent = SpecAgent()
