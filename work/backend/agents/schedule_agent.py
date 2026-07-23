from datetime import datetime, timedelta
from sqlalchemy.orm import Session

import models
import llm_service
from slack_utils import send_slack_notification


def parse_date(date_str: str, default_offset_days: int = 0):
    """
    날짜 문자열을 Python date 객체로 변환하며 실패 시 기본 오프셋 날짜를 산출해 반환합니다.
    """
    try:
        return datetime.strptime(date_str, "%Y-%m-%d").date()
    except Exception:
        return (datetime.today() + timedelta(days=default_offset_days)).date()


class ScheduleAgent:
    """
    PRD/기능명세서를 분석하여 프로젝트의 에픽(일정보드) 및 논리 상충 경고 에픽을
    자동으로 도출하고 DB에 적재하는 단일 책임 에이전트.
    """

    def run(
        self,
        db: Session,
        project: models.Project,
        prd_content: str,
        spec_content: str,
        existing_api_spec: str = "",
        existing_db_schema: str = ""
    ) -> dict:
        analysis_result = llm_service.analyze_specifications(
            prd_content=prd_content,
            spec_content=spec_content,
            existing_api_spec=existing_api_spec,
            existing_db_schema=existing_db_schema
        )

        epics_data = analysis_result.get("epics", [])
        conflicts_data = analysis_result.get("conflicts", [])

        created_epics = []
        warning_count = 0

        try:
            # 개발 에픽 일정 저장
            for epic_item in epics_data:
                start_d = parse_date(epic_item.get("start_date"), 0)
                due_d = parse_date(epic_item.get("due_date"), 5)

                db_epic = models.Epic(
                    project_id=project.id,
                    title=epic_item.get("title", "Generated Epic"),
                    description=epic_item.get("description", ""),
                    start_date=start_d,
                    due_date=due_d
                )
                db.add(db_epic)
                db.flush()
                created_epics.append(db_epic)

            # 상충 경고 에픽 인서트 및 실시간 슬랙 알림 발송
            for conflict_item in conflicts_data:
                start_d = parse_date(conflict_item.get("start_date"), 0)
                due_d = parse_date(conflict_item.get("due_date"), 0)

                title = conflict_item.get("title", "Logical Mismatch")
                if not title.startswith("[AI-Detected]"):
                    title = f"[AI-Detected] {title}"

                db_conflict = models.Epic(
                    project_id=project.id,
                    title=title,
                    description=conflict_item.get("description", "logical contradiction detected in design spec."),
                    start_date=start_d,
                    due_date=due_d
                )
                db.add(db_conflict)
                db.flush()

                warning_count += 1
                created_epics.append(db_conflict)

                slack_msg = (
                    f"⚠️ [AI-Detected] 기획 충돌 이슈가 등록되었습니다. WBS 타임라인을 확인해 주세요.\n"
                    f"*이슈 제목*: {title}\n*상세 내용*: {db_conflict.description}"
                )
                send_slack_notification(db, slack_msg)

            db.commit()

            for e in created_epics:
                db.refresh(e)

            return {
                "created_epics_count": len(epics_data),
                "warning_epics_count": warning_count,
                "epics": created_epics
            }
        except Exception as db_err:
            db.rollback()
            raise RuntimeError(f"일정 데이터베이스 저장 중 오류가 발생했습니다: {db_err}")


schedule_agent = ScheduleAgent()
