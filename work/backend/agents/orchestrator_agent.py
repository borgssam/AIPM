from sqlalchemy.orm import Session

import models
from agents.schedule_agent import schedule_agent
from agents.task_agent import task_agent


class OrchestratorAgent:
    """
    ScheduleAgent(일정보드 생성)와 TaskAgent(칸반 태스크 생성)를
    사용자가 선택한 옵션(create_schedule_board, create_kanban_tasks)에 따라
    조합 및 순차 실행하도록 지휘하는 오케스트레이션 에이전트.
    """

    def run(
        self,
        db: Session,
        project: models.Project,
        prd_content: str,
        spec_content: str,
        create_schedule_board: bool,
        create_kanban_tasks: bool,
        existing_api_spec: str = "",
        existing_db_schema: str = ""
    ) -> dict:
        created_epics_count = 0
        warning_epics_count = 0
        result_epics = []
        created_tickets_count = 0

        if create_schedule_board:
            schedule_result = schedule_agent.run(
                db=db,
                project=project,
                prd_content=prd_content,
                spec_content=spec_content,
                existing_api_spec=existing_api_spec,
                existing_db_schema=existing_db_schema
            )
            created_epics_count = schedule_result["created_epics_count"]
            warning_epics_count = schedule_result["warning_epics_count"]
            result_epics = schedule_result["epics"]

        if create_kanban_tasks:
            # 이번 실행에서 일정보드를 새로 만들었다면 그 에픽들을, 아니라면 프로젝트에 이미 존재하는 에픽들을 대상으로 태스크를 분해합니다.
            if create_schedule_board:
                target_epics = result_epics
            else:
                target_epics = db.query(models.Epic).filter(
                    models.Epic.project_id == project.id
                ).all()

            if not target_epics:
                raise RuntimeError("칸반 태스크를 생성할 대상 에픽(일정)이 존재하지 않습니다. 먼저 일정보드를 생성해 주세요.")

            created_tickets_count = task_agent.run_for_epics(db, project, target_epics)

        return {
            "created_epics_count": created_epics_count,
            "warning_epics_count": warning_epics_count,
            "epics": result_epics,
            "created_tickets_count": created_tickets_count
        }


orchestrator_agent = OrchestratorAgent()
