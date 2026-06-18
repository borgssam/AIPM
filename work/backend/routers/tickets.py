from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

# backend 폴더 내 모듈 임포트
from database import get_db
import models
import schemas
import auth_utils

router = APIRouter()

@router.get("/", response_model=List[schemas.TicketResponse])
def get_tickets(
    project_id: Optional[int] = None,
    search: Optional[str] = None,
    priority: Optional[str] = None,
    assignee_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    """
    프로젝트ID(project_id), 검색어(search), 우선순위(priority), 담당자(assignee_id) 조건에 부합하는 전체 칸반 티켓 조회 API.
    (joinedload를 사용하여 N+1 쿼리 문제를 예방하고 관계형 필드 qa_items 및 assignee를 즉시 로드)
    """
    query = db.query(models.KanbanTicket).options(
        joinedload(models.KanbanTicket.qa_items),
        joinedload(models.KanbanTicket.assignee)
    )
    
    # 프로젝트 필터 적용
    if project_id:
        query = query.filter(models.KanbanTicket.project_id == project_id)
    
    # 실시간 검색어 쿼리 필터 적용
    if search:
        query = query.filter(
            (models.KanbanTicket.title.contains(search)) |
            (models.KanbanTicket.description.contains(search))
        )
        
    # 우선순위 필터 적용
    if priority and priority != "ALL":
        query = query.filter(models.KanbanTicket.priority == priority)
        
    # 담당자 배정 필터 적용
    if assignee_id:
        query = query.filter(models.KanbanTicket.assignee_id == assignee_id)
        
    tickets = query.all()
    return tickets
