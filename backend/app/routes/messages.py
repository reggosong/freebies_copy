from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app import schemas, crud, utils
from app.db import get_db
from app.models.message import MessageType

router = APIRouter(prefix="/messages", tags=["messages"])

# Get user's inbox
@router.get("/", response_model=List[schemas.MessageRead])
def get_inbox(
    skip: int = 0,
    limit: int = 20,
    message_type: MessageType = None,
    unread_only: bool = False,
    db: Session = Depends(get_db),
    current_user: schemas.UserRead = Depends(utils.get_current_user)
):
    return crud.get_user_messages(
        db,
        current_user.id,
        skip=skip,
        limit=limit,
        message_type=message_type,
        unread_only=unread_only
    )

# Mark message as read
@router.put("/{message_id}/read", response_model=schemas.MessageRead)
def mark_message_read(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.UserRead = Depends(utils.get_current_user)
):
    message = crud.get_message(db, message_id)
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    if message.receiver_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to read this message")
    return crud.mark_message_read(db, message_id)

# Mark all messages as read
@router.put("/read-all", response_model=List[schemas.MessageRead])
def mark_all_messages_read(
    db: Session = Depends(get_db),
    current_user: schemas.UserRead = Depends(utils.get_current_user)
):
    return crud.mark_all_messages_read(db, current_user.id)

# Delete message
@router.delete("/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_message(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.UserRead = Depends(utils.get_current_user)
):
    message = crud.get_message(db, message_id)
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    if message.receiver_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this message")
    crud.delete_message(db, message_id)
    return None

# Get unread message count
@router.get("/unread/count", response_model=schemas.MessageCount)
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: schemas.UserRead = Depends(utils.get_current_user)
):
    return crud.get_unread_message_count(db, current_user.id) 