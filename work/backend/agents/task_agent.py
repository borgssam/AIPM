from typing import List
from sqlalchemy.orm import Session

import models
import llm_service


class TaskAgent:
    """
    에픽(일정) 정보를 바탕으로 세부 칸반 태스크 및 QA 검수 항목을
    자동으로 도출하고 DB에 적재하는 단일 책임 에이전트.
    """

    def run_for_epic(
        self,
        db: Session,
        project: models.Project,
        epic: models.Epic,
        exclude_existing: bool = True
    ) -> int:
        existing_ticket_titles = []
        if exclude_existing:
            existing_ticket_titles = [t.title for t in epic.tickets]

        recommendations = llm_service.recommend_epic_tickets(
            prd_content=project.prd_content or "",
            spec_content=project.spec_content or "",
            epic_title=epic.title,
            epic_description=epic.description or "",
            existing_tickets=existing_ticket_titles
        )

        tasks = recommendations.get("recommendations", [])
        created_count = 0

        try:
            for t_data in tasks:
                db_ticket = models.KanbanTicket(
                    title=t_data.get("title", "Generated Task"),
                    description=t_data.get("description", ""),
                    status=models.TicketStatus.TO_DO.value,
                    priority=t_data.get("priority", "P1"),
                    project_id=project.id
                )
                db_ticket.epics.append(epic)
                db.add(db_ticket)
                db.flush()  # ticket ID 획득

                if t_data.get("need_functional_qa"):
                    func_item = models.QAInspectionItem(
                        ticket_id=db_ticket.id,
                        category="FUNCTIONAL",
                        title=t_data.get("functional_qa_title") or "기능 검수",
                        status=models.QAItemStatus.UNTESTED.value
                    )
                    db.add(func_item)

                if t_data.get("need_quality_qa"):
                    qual_item = models.QAInspectionItem(
                        ticket_id=db_ticket.id,
                        category="QUALITY",
                        title=t_data.get("quality_qa_title") or "품질 검수",
                        status=models.QAItemStatus.UNTESTED.value
                    )
                    db.add(qual_item)

                created_count += 1

            db.commit()
            return created_count
        except Exception as db_err:
            db.rollback()
            raise RuntimeError(f"칸반 태스크 생성 중 오류가 발생했습니다: {db_err}")

    def run_for_epics(
        self,
        db: Session,
        project: models.Project,
        epics: List[models.Epic],
        exclude_existing: bool = True
    ) -> int:
        total_created = 0
        for epic in epics:
            # [AI-Detected] 상충 경고성 에픽은 실제 개발 태스크 분해 대상에서 제외
            if epic.title.startswith("[AI-Detected]"):
                continue
            total_created += self.run_for_epic(db, project, epic, exclude_existing=exclude_existing)
        return total_created


task_agent = TaskAgent()
