from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
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

@router.put("/{ticket_id}", response_model=schemas.TicketResponse)
def update_ticket(
    ticket_id: int,
    ticket_update: schemas.TicketUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    """
    티켓 ID에 해당하는 태스크 티켓의 필드(시작일, 마감일 등)를 수정하는 API.
    """
    ticket = db.query(models.KanbanTicket).filter(models.KanbanTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="티켓을 찾을 수 없습니다.")
    
    update_data = ticket_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(ticket, key, value)
    
    db.commit()
    db.refresh(ticket)
    return ticket
