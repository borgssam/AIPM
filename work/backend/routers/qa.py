from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
import auth_utils
from pydantic import BaseModel

router = APIRouter()

class QAItemUpdate(BaseModel):
    status: str

@router.patch("/items/{item_id}", response_model=schemas.QAItemResponse)
def update_qa_item(
    item_id: int,
    payload: QAItemUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    """
    QA 검수 항목의 상태를 업데이트하는 API.
    - QA 역할: PASS 또는 FAIL로 변경 가능
    - PM 역할: APPROVED로 승인 가능
    - 기타 역할: 변경 불가 (403 Forbidden)
    """
    qa_item = db.query(models.QAInspectionItem).filter(models.QAInspectionItem.id == item_id).first()
    if not qa_item:
        raise HTTPException(status_code=404, detail="QA 검수 항목을 찾을 수 없습니다.")

    new_status = payload.status
    if new_status not in [models.QAItemStatus.UNTESTED.value, models.QAItemStatus.PASS.value, models.QAItemStatus.FAIL.value, models.QAItemStatus.APPROVED.value]:
        raise HTTPException(status_code=400, detail="유효하지 않은 검수 상태입니다.")

    if new_status in [models.QAItemStatus.PASS.value, models.QAItemStatus.FAIL.value]:
        if current_user.role != "QA":
            raise HTTPException(
                status_code=403,
                detail="검수(PASS/FAIL)는 QA 역할의 사용자만 수행할 수 있습니다."
            )
    elif new_status == models.QAItemStatus.APPROVED.value:
        if current_user.role != "PM":
            raise HTTPException(
                status_code=403,
                detail="승인(APPROVED)은 PM 역할의 사용자만 수행할 수 있습니다."
            )
    else:
        # UNTESTED 등으로 되돌리는 행위는 QA/PM만 가능하도록 제한
        if current_user.role not in ["QA", "PM"]:
            raise HTTPException(
                status_code=403,
                detail="권한이 없습니다."
            )

    qa_item.status = new_status
    db.flush()

    # 만약 상태가 APPROVED로 변경되었고 티켓과 연계되어 있다면,
    # 해당 티켓의 모든 QA 검수 항목이 APPROVED인지 확인 후 티켓 상태를 DONE(완료)으로 자동 업데이트합니다.
    if new_status == models.QAItemStatus.APPROVED.value and qa_item.ticket_id:
        ticket = db.query(models.KanbanTicket).filter(models.KanbanTicket.id == qa_item.ticket_id).first()
        if ticket:
            all_items = db.query(models.QAInspectionItem).filter(models.QAInspectionItem.ticket_id == ticket.id).all()
            if all_items and all(item.status == models.QAItemStatus.APPROVED.value for item in all_items):
                ticket.status = models.TicketStatus.DONE.value

    db.commit()
    db.refresh(qa_item)
    return qa_item
