from sqlalchemy.orm import Session, joinedload, subqueryload
from sqlalchemy import func, desc, and_, or_
from app import models, schemas, utils
from typing import List, Optional
from datetime import datetime
import math
from app.models.post import PostCategory
from app.models.message import MessageType
from app.models.interaction import Notification, NotificationType, HiddenPost
from fastapi import HTTPException

# Haversine distance function
def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371  # Earth radius in kilometers
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    a = (math.sin(dLat / 2) * math.sin(dLat / 2) +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dLon / 2) * math.sin(dLon / 2))
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    distance = R * c
    return distance

# User operations
def get_user(db: Session, user_id: int):
    return db.query(models.user.User).options(
        subqueryload(models.user.User.posts).subqueryload(models.post.Post.got_it),
        joinedload(models.user.User.followers),
        joinedload(models.user.User.following),
    ).filter(models.user.User.id == user_id).first()

def get_user_by_username(db: Session, username: str):
    return db.query(models.user.User).filter(models.user.User.username == username).first()

def get_user_by_email(db: Session, email: str):
    return db.query(models.user.User).filter(models.user.User.email == email).first()

def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.user.User).offset(skip).limit(limit).all()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = utils.get_password_hash(user.password)
    db_user = models.user.User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user(db: Session, user_id: int, update_data: dict):
    db_user = get_user(db, user_id)
    for key, value in update_data.items():
        setattr(db_user, key, value)
    db.commit()
    db.refresh(db_user)
    return db_user

# Post operations
def get_post(db: Session, post_id: int):
    return db.query(models.post.Post).filter(models.post.Post.id == post_id).first()

def get_user_posts(db: Session, user_id: int, skip: int = 0, limit: int = 20):
    return db.query(models.post.Post).filter(models.post.Post.owner_id == user_id).order_by(desc(models.post.Post.created_at)).offset(skip).limit(limit).all()

def create_post(db: Session, post: schemas.PostCreate, user_id: int):
    post_dict = post.dict()
    # Convert Enum to string if needed
    if hasattr(post_dict['category'], 'value'):
        post_dict['category'] = post_dict['category'].value
    post_dict.pop('city', None)  # Remove city if present
    db_post = models.post.Post(**post_dict, owner_id=user_id)
    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    return db_post

def update_post(db: Session, post_id: int, post: schemas.PostUpdate):
    db_post = get_post(db, post_id)
    update_data = post.dict(exclude_unset=True)

    # Convert category enum to its string value before updating
    if 'category' in update_data and hasattr(update_data['category'], 'value'):
        update_data['category'] = update_data['category'].value

    for key, value in update_data.items():
        setattr(db_post, key, value)
    db.commit()
    db.refresh(db_post)
    return db_post

def delete_post(db: Session, post_id: int):
    db_post = get_post(db, post_id)
    # Manually nullify the post_id in associated GotIt records
    for got_it_record in db_post.got_it:
        got_it_record.post_id = None
    db.delete(db_post)
    db.commit()

def get_feed(
    db: Session,
    user_id: int,
    skip: int = 0,
    limit: int = 20,
    category: Optional[PostCategory] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    radius: Optional[float] = None,
    following_only: bool = False
):
    # Get all post IDs that the user has hidden
    hidden_post_ids_query = db.query(models.interaction.HiddenPost.post_id).filter(
        models.interaction.HiddenPost.user_id == user_id
    )
    hidden_post_ids = {row[0] for row in hidden_post_ids_query.all()}
    
    query = db.query(models.post.Post)
    
    # Exclude hidden posts
    if hidden_post_ids:
        query = query.filter(models.post.Post.id.notin_(hidden_post_ids))
    
    if following_only:
        following_ids = [f.following_id for f in db.query(models.follow.Follow).filter(models.follow.Follow.follower_id == user_id).all()]
        query = query.filter(models.post.Post.owner_id.in_(following_ids))
    
    if category:
        category_value = category.value if hasattr(category, 'value') else category
        query = query.filter(models.post.Post.category == category_value)
    
    if latitude and longitude and radius:
        # Haversine formula for distance calculation
        query = query.filter(
            func.acos(
                func.sin(func.radians(latitude)) * func.sin(func.radians(models.post.Post.latitude)) +
                func.cos(func.radians(latitude)) * func.cos(func.radians(models.post.Post.latitude)) *
                func.cos(func.radians(longitude - models.post.Post.longitude))
            ) * 6371 <= radius  # 6371 is Earth's radius in kilometers
        )
    
    return query.order_by(desc(models.post.Post.created_at)).offset(skip).limit(limit).all()

def hide_post(db: Session, user_id: int, post_id: int):
    existing_hidden = db.query(models.interaction.HiddenPost).filter(
        models.interaction.HiddenPost.user_id == user_id,
        models.interaction.HiddenPost.post_id == post_id
    ).first()

    if existing_hidden:
        return existing_hidden

    db_hidden_post = models.interaction.HiddenPost(user_id=user_id, post_id=post_id)
    db.add(db_hidden_post)
    db.commit()
    db.refresh(db_hidden_post)
    return db_hidden_post

def unhide_post(db: Session, user_id: int, post_id: int):
    hidden_post = db.query(models.interaction.HiddenPost).filter(
        models.interaction.HiddenPost.user_id == user_id,
        models.interaction.HiddenPost.post_id == post_id
    ).first()

    if not hidden_post:
        return None

    db.delete(hidden_post)
    db.commit()
    return {"message": "Post unhidden successfully"}

def is_post_hidden(db: Session, user_id: int, post_id: int) -> bool:
    hidden_post = db.query(models.interaction.HiddenPost).filter(
        models.interaction.HiddenPost.user_id == user_id,
        models.interaction.HiddenPost.post_id == post_id
    ).first()
    return hidden_post is not None

# Interaction operations
def toggle_like(db: Session, post_id: int, user_id: int):
    existing_like = db.query(models.interaction.Like).filter(
        models.interaction.Like.post_id == post_id,
        models.interaction.Like.user_id == user_id
    ).first()
    post = db.query(models.post.Post).filter(models.post.Post.id == post_id).first()
    actor = db.query(models.user.User).filter(models.user.User.id == user_id).first()
    if existing_like:
        db.delete(existing_like)
        db.commit()
        return None
    db_like = models.interaction.Like(post_id=post_id, user_id=user_id)
    db.add(db_like)
    db.commit()
    db.refresh(db_like)
    # Notification
    create_notification(db, post, actor, NotificationType.LIKE, f"{actor.display_name or actor.username} liked your post")
    return db_like

def create_comment(db: Session, post_id: int, user_id: int, comment: schemas.CommentCreate):
    db_comment = models.interaction.Comment(**comment.dict(), post_id=post_id, user_id=user_id)
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    # Notification
    post = db.query(models.post.Post).filter(models.post.Post.id == post_id).first()
    actor = db.query(models.user.User).filter(models.user.User.id == user_id).first()
    create_notification(db, post, actor, NotificationType.COMMENT, f"{actor.display_name or actor.username} commented on your post")
    return db_comment

def toggle_got_it(db: Session, post_id: int, user_id: int):
    post = get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.is_gone:
        raise HTTPException(status_code=400, detail="This item has been reported as gone and can no longer be marked as 'Got It'.")

    existing_got_it = db.query(models.interaction.GotIt).filter(
        models.interaction.GotIt.post_id == post_id,
        models.interaction.GotIt.user_id == user_id
    ).first()
    post = db.query(models.post.Post).filter(models.post.Post.id == post_id).first()
    actor = db.query(models.user.User).filter(models.user.User.id == user_id).first()
    if existing_got_it:
        db.delete(existing_got_it)
        db.commit()
        return None
    db_got_it = models.interaction.GotIt(
        post_id=post_id, 
        user_id=user_id, 
        giver_id=post.owner_id
    )
    db.add(db_got_it)
    db.commit()
    db.refresh(db_got_it)
    # Notification
    create_notification(db, post, actor, NotificationType.GOT_IT, f"{actor.display_name or actor.username} got the item from your post")
    return db_got_it

def delete_comment(db: Session, comment_id: int, user_id: int):
    comment = db.query(models.interaction.Comment).filter(models.interaction.Comment.id == comment_id).first()
    if not comment:
        return False
    if comment.user_id != user_id:
        return False
    db.delete(comment)
    db.commit()
    return True

# Follow operations
def toggle_follow(db: Session, follower_id: int, following_id: int):
    existing_follow = db.query(models.follow.Follow).filter(
        models.follow.Follow.follower_id == follower_id,
        models.follow.Follow.following_id == following_id
    ).first()
    
    if existing_follow:
        db.delete(existing_follow)
        db.commit()
        return None
    
    db_follow = models.follow.Follow(follower_id=follower_id, following_id=following_id)
    db.add(db_follow)

    # Create notification for the user being followed
    try:
        actor = db.query(models.user.User).filter(models.user.User.id == follower_id).first()
        if actor:
            notif = models.interaction.Notification(
                user_id=following_id,  # The user being followed
                actor_id=follower_id,  # The user who followed
                type=models.interaction.NotificationType.FOLLOW,
                message=f"{actor.display_name or actor.username} started following you."
            )
            db.add(notif)
    except Exception as e:
        # Log the error, but don't fail the follow action
        print(f"Error creating follow notification: {e}")

    db.commit()
    db.refresh(db_follow)
    return db_follow

def get_user_followers(db: Session, user_id: int, skip: int = 0, limit: int = 20):
    return db.query(models.user.User).join(
        models.follow.Follow, models.follow.Follow.follower_id == models.user.User.id
    ).filter(
        models.follow.Follow.following_id == user_id
    ).offset(skip).limit(limit).all()

def get_user_following(db: Session, user_id: int, skip: int = 0, limit: int = 20):
    return db.query(models.user.User).join(
        models.follow.Follow, models.follow.Follow.following_id == models.user.User.id
    ).filter(
        models.follow.Follow.follower_id == user_id
    ).offset(skip).limit(limit).all()

def mark_all_notifications_as_read(db: Session, user_id: int):
    db.query(models.interaction.Notification).filter(
        models.interaction.Notification.user_id == user_id,
        models.interaction.Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"status": "success"}

# Message operations
def get_message(db: Session, message_id: int):
    return db.query(models.message.Message).filter(models.message.Message.id == message_id).first()

def get_user_messages(
    db: Session,
    user_id: int,
    skip: int = 0,
    limit: int = 20,
    message_type: Optional[MessageType] = None,
    unread_only: bool = False
):
    query = db.query(models.message.Message).filter(models.message.Message.receiver_id == user_id)
    
    if message_type:
        query = query.filter(models.message.Message.type == message_type)
    
    if unread_only:
        query = query.filter(models.message.Message.read == False)
    
    return query.order_by(desc(models.message.Message.created_at)).offset(skip).limit(limit).all()

def mark_message_read(db: Session, message_id: int):
    message = get_message(db, message_id)
    message.read = True
    db.commit()
    db.refresh(message)
    return message

def mark_all_messages_read(db: Session, user_id: int):
    messages = db.query(models.message.Message).filter(
        models.message.Message.receiver_id == user_id,
        models.message.Message.read == False
    ).all()
    
    for message in messages:
        message.read = True
    
    db.commit()
    return messages

def delete_message(db: Session, message_id: int):
    message = get_message(db, message_id)
    db.delete(message)
    db.commit()

def get_unread_message_count(db: Session, user_id: int):
    total = db.query(func.count(models.message.Message.id)).filter(
        models.message.Message.receiver_id == user_id,
        models.message.Message.read == False
    ).scalar()
    
    by_type = {}
    for message_type in MessageType:
        count = db.query(func.count(models.message.Message.id)).filter(
            models.message.Message.receiver_id == user_id,
            models.message.Message.read == False,
            models.message.Message.type == message_type
        ).scalar()
        by_type[message_type.value] = count
    
    return {"total": total, "by_type": by_type}

# Authentication
def authenticate_user(db: Session, username: str, password: str):
    user = get_user_by_username(db, username)
    if not user:
        return False
    if not utils.verify_password(password, user.hashed_password):
        return False
    return user

def create_notification(db, post, actor, notif_type, message=None):
    # Don't notify if actor is the post owner
    if post.owner_id == actor.id:
        return None
    # Only one LIKE or GOT_IT notification per user per post
    if notif_type in [NotificationType.LIKE, NotificationType.GOT_IT]:
        existing = db.query(Notification).filter_by(
            user_id=post.owner_id,
            post_id=post.id,
            actor_id=actor.id,
            type=notif_type
        ).first()
        if existing:
            return None
    notif = Notification(
        user_id=post.owner_id,
        post_id=post.id,
        actor_id=actor.id,
        type=notif_type,
        message=message,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif 