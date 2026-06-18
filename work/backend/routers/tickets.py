from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
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
        joinedload(models.KanbanTicket.assignee),
        joinedload(models.KanbanTicket.epics)
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


@router.post("/", response_model=schemas.TicketResponse)
def create_ticket(
    ticket_create: schemas.TicketCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    """
    새로운 칸반 티켓(태스크)을 생성하는 API.
    - PM 역할의 사용자는 어떤 유저든 담당자로 지정할 수 있습니다.
    - 일반 개발자 등 PM이 아닌 사용자는 본인만을 담당자로 지정할 수 있습니다.
    """
    if current_user.role != "PM":
        if ticket_create.assignee_id is not None and ticket_create.assignee_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="자신이 아닌 다른 사용자를 담당자로 지정할 수 없습니다."
            )

    ticket_data = ticket_create.model_dump()
    qa_fields = ["need_functional_qa", "need_quality_qa", "functional_qa_title", "quality_qa_title"]
    epic_ids = ticket_data.pop("epic_ids", [])
    ticket_db_data = {k: v for k, v in ticket_data.items() if k not in qa_fields}

    db_ticket = models.KanbanTicket(**ticket_db_data)
    
    # 에픽 Many-to-Many 연결
    if epic_ids:
        epics = db.query(models.Epic).filter(models.Epic.id.in_(epic_ids)).all()
        db_ticket.epics = epics

    db.add(db_ticket)
    db.flush()  # ticket ID 획득

    # QA 검수 항목 생성
    if ticket_create.need_functional_qa:
        title = ticket_create.functional_qa_title or "기능 검수"
        func_item = models.QAInspectionItem(
            ticket_id=db_ticket.id,
            category="FUNCTIONAL",
            title=title,
            status=models.QAItemStatus.UNTESTED.value
        )
        db.add(func_item)

    if ticket_create.need_quality_qa:
        title = ticket_create.quality_qa_title or "품질 검수"
        qual_item = models.QAInspectionItem(
            ticket_id=db_ticket.id,
            category="QUALITY",
            title=title,
            status=models.QAItemStatus.UNTESTED.value
        )
        db.add(qual_item)

    db.commit()
    db.refresh(db_ticket)

    # 로드하여 반환
    ticket = db.query(models.KanbanTicket).options(
        joinedload(models.KanbanTicket.qa_items),
        joinedload(models.KanbanTicket.assignee),
        joinedload(models.KanbanTicket.epics)
    ).filter(models.KanbanTicket.id == db_ticket.id).first()
    return ticket


@router.put("/{ticket_id}", response_model=schemas.TicketResponse)
def update_ticket(
    ticket_id: int,
    ticket_update: schemas.TicketUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    """
    티켓 ID에 해당하는 태스크 티켓의 필드(상태, 시작일, 마감일 등)를 수정하는 API.
    - 담당자 배정 규칙: PM은 누구나 지정 가능, 일반 사용자는 자기 자신 혹은 미배정(None)만 지정 가능.
    - QA 검수 완료 하드 게이트: DONE 상태로 전이하려면 모든 연계 QA 검수 항목이 APPROVED 상태여야 합니다.
    - QA 검수 체크리스트 동기화: 체크박스 및 제목 필드 변경 시 DB 항목을 생성하거나 삭제/수정합니다.
    """
    ticket = db.query(models.KanbanTicket).options(
        joinedload(models.KanbanTicket.qa_items),
        joinedload(models.KanbanTicket.assignee),
        joinedload(models.KanbanTicket.epics)
    ).filter(models.KanbanTicket.id == ticket_id).first()
    
    if not ticket:
        raise HTTPException(status_code=404, detail="티켓을 찾을 수 없습니다.")

    # 1. 담당자 지정 제한 체크
    if current_user.role != "PM":
        # assignee_id가 변경 시도되는 경우
        if ticket_update.assignee_id is not None and ticket_update.assignee_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="자신이 아닌 다른 사용자를 담당자로 지정할 수 없습니다."
            )

    # 2. QA 검수 완료 하드 게이트 (DONE 전이 검증)
    new_status = ticket_update.status if ticket_update.status is not None else ticket.status
    if new_status == models.TicketStatus.DONE.value:
        for item in ticket.qa_items:
            if item.status != models.QAItemStatus.APPROVED.value:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="모든 QA 검수 항목이 승인 완료(APPROVED)되어야 완료(DONE) 상태로 변경할 수 있습니다."
                )

    # 3. QA 체크박스 동기화
    # 기능 검수
    if ticket_update.need_functional_qa is not None:
        func_item = next((item for item in ticket.qa_items if item.category == "FUNCTIONAL"), None)
        if ticket_update.need_functional_qa:
            title = ticket_update.functional_qa_title or "기능 검수"
            if not func_item:
                new_func_item = models.QAInspectionItem(
                    ticket_id=ticket.id,
                    category="FUNCTIONAL",
                    title=title,
                    status=models.QAItemStatus.UNTESTED.value
                )
                db.add(new_func_item)
            else:
                if ticket_update.functional_qa_title:
                    func_item.title = ticket_update.functional_qa_title
        else:
            if func_item:
                db.delete(func_item)
    elif ticket_update.functional_qa_title is not None:
        func_item = next((item for item in ticket.qa_items if item.category == "FUNCTIONAL"), None)
        if func_item:
            func_item.title = ticket_update.functional_qa_title

    # 품질 검수
    if ticket_update.need_quality_qa is not None:
        qual_item = next((item for item in ticket.qa_items if item.category == "QUALITY"), None)
        if ticket_update.need_quality_qa:
            title = ticket_update.quality_qa_title or "품질 검수"
            if not qual_item:
                new_qual_item = models.QAInspectionItem(
                    ticket_id=ticket.id,
                    category="QUALITY",
                    title=title,
                    status=models.QAItemStatus.UNTESTED.value
                )
                db.add(new_qual_item)
            else:
                if ticket_update.quality_qa_title:
                    qual_item.title = ticket_update.quality_qa_title
        else:
            if qual_item:
                db.delete(qual_item)
    elif ticket_update.quality_qa_title is not None:
        qual_item = next((item for item in ticket.qa_items if item.category == "QUALITY"), None)
        if qual_item:
            qual_item.title = ticket_update.quality_qa_title

    # 4. 에픽 Many-to-Many 관계 업데이트
    update_data = ticket_update.model_dump(exclude_unset=True)
    if "epic_ids" in update_data:
        epic_ids = update_data.pop("epic_ids")
        if epic_ids is not None:
            epics = db.query(models.Epic).filter(models.Epic.id.in_(epic_ids)).all()
            ticket.epics = epics
        else:
            ticket.epics = []

    # 5. 티켓 기본 정보 업데이트 (QA 제어 가상 필드 제외)
    qa_fields = ["need_functional_qa", "need_quality_qa", "functional_qa_title", "quality_qa_title"]
    for field in qa_fields:
        update_data.pop(field, None)

    for key, value in update_data.items():
        setattr(ticket, key, value)

    db.commit()

    # 명시적으로 로드하여 최신 상태 반환
    ticket = db.query(models.KanbanTicket).options(
        joinedload(models.KanbanTicket.qa_items),
        joinedload(models.KanbanTicket.assignee),
        joinedload(models.KanbanTicket.epics)
    ).filter(models.KanbanTicket.id == ticket_id).first()
    return ticket
