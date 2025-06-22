from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request, Form
from sqlalchemy.orm import Session
from typing import List
from app import schemas, crud, utils
from app.db import get_db
import shutil
import os
from datetime import datetime
import logging
from app.models.interaction import Notification
from app.schemas import NotificationRead
from app.models.user import User

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["users"])

# Helper to build absolute URL for photo
def build_absolute_photo_url(request: Request, photo_url: str) -> str:
    logger.info(f"Building absolute URL for: {photo_url}")
    if not photo_url:
        return None
    if photo_url.startswith('http'):
        logger.info(f"URL already absolute: {photo_url}")
        return photo_url

    # Ensure the URL starts with uploads/
    if not photo_url.startswith('uploads/'):
        photo_url = f"uploads/{photo_url.lstrip('/')}"

    base_url = str(request.base_url).rstrip('/')
    # Only replace double slashes after the protocol
    protocol_parts = base_url.split('://', 1)
    if len(protocol_parts) > 1:
        protocol = protocol_parts[0] + '://'
        path = protocol_parts[1].replace('//', '/')
        base_url = protocol + path
    
    absolute_url = f"{base_url}/{photo_url}"
    
    logger.info(f"Built absolute URL: {absolute_url}")
    logger.info(f"From base_url: {base_url}")
    logger.info(f"And photo_url: {photo_url}")
    return absolute_url

# Get current user profile
@router.get("/me", response_model=schemas.UserProfile)
def get_current_user_profile(
    request: Request,
    current_user: schemas.UserRead = Depends(utils.get_current_user),
    db: Session = Depends(get_db)
):
    logger.info("="*50)
    logger.info("GET /users/me endpoint called")
    logger.info(f"Request base URL: {request.base_url}")
    
    # Get the full user object to access the stats property
    user = crud.get_user(db, current_user.id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get the stats explicitly
    user_stats = user.stats
    logger.info(f"User stats: {user_stats}")
    
    user_dict = current_user.dict()
    logger.info(f"Original profile_picture_url: {user_dict.get('profile_picture_url')}")
    if user_dict.get("profile_picture_url"):
        absolute_url = build_absolute_photo_url(request, user_dict["profile_picture_url"])
        logger.info(f"Converted to absolute URL: {absolute_url}")
        user_dict["profile_picture_url"] = absolute_url
    
    # Add stats to the response
    user_dict["stats"] = user_stats
    
    # Add level info to the response
    user_dict["level_info"] = user.level_info
    
    logger.info("="*50)
    return user_dict

# Update current user profile
@router.put("/me", response_model=schemas.UserProfile)
async def update_current_user_profile(
    request: Request,
    display_name: str = Form(default=None),
    bio: str = Form(default=None),
    latitude: float = Form(default=None),
    longitude: float = Form(default=None),
    profile_picture: UploadFile = File(default=None),
    db: Session = Depends(get_db),
    current_user: schemas.UserRead = Depends(utils.get_current_user)
):
    try:
        logger.info("="*50)
        logger.info("PUT /users/me endpoint called")
        logger.info(f"Received display_name: {display_name}")
        
        update_data = {}
        
        # Handle display name
        if display_name is not None:
            display_name = display_name.strip()
            if len(display_name) > 0:  # Only update if non-empty
                update_data["display_name"] = display_name
            logger.info(f"Processed display_name: {display_name}")
        
        # Handle other fields
        if bio is not None:
            update_data["bio"] = bio.strip()
        if latitude is not None:
            update_data["latitude"] = float(latitude)
        if longitude is not None:
            update_data["longitude"] = float(longitude)
        
        # Handle profile picture
        if profile_picture:
            try:
                # Save profile picture
                photo_path = f"profiles/{datetime.now().strftime('%Y%m%d_%H%M%S')}_{profile_picture.filename}"
                full_path = os.path.join("uploads", photo_path)
                os.makedirs(os.path.dirname(full_path), exist_ok=True)
                
                with open(full_path, "wb") as buffer:
                    shutil.copyfileobj(profile_picture.file, buffer)
                
                # Store the path with uploads prefix
                update_data["profile_picture_url"] = f"uploads/{photo_path}"
                logger.info(f"Saved profile picture to: {full_path}")
            except Exception as e:
                logger.error(f"Error saving profile picture: {str(e)}")
                raise HTTPException(status_code=500, detail="Failed to save profile picture")
        
        logger.info(f"Update data: {update_data}")
        
        # Update the user
        try:
            updated_user = crud.update_user(db, current_user.id, update_data)
            logger.info(f"User updated successfully: {updated_user.id}")
        except Exception as e:
            logger.error(f"Error updating user in database: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to update user in database")
        
        # Convert to dict and handle profile picture URL
        try:
            user_dict = updated_user.__dict__.copy()
            if user_dict.get("profile_picture_url"):
                user_dict["profile_picture_url"] = build_absolute_photo_url(request, user_dict["profile_picture_url"])
            
            # Add stats to response
            user_dict["stats"] = updated_user.stats
            
            # Add level info to the response
            user_dict["level_info"] = updated_user.level_info
            
            logger.info(f"Final response data: {user_dict}")
            logger.info("="*50)
            
            return user_dict
        except Exception as e:
            logger.error(f"Error preparing response: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to prepare response")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in update_current_user_profile: {str(e)}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred")

# Add new endpoint for user lookup by username
@router.get("/lookup", response_model=schemas.UserProfile)
def lookup_user_by_username(username: str, db: Session = Depends(get_db), request: Request = None):
    user = crud.get_user_by_username(db, username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get the stats explicitly
    user_stats = user.stats
    
    user_dict = user.__dict__.copy()
    if user_dict.get("profile_picture_url"):
        user_dict["profile_picture_url"] = build_absolute_photo_url(request, user_dict["profile_picture_url"])
    
    # Add stats to the response
    user_dict["stats"] = user_stats
    
    # Add level info to the response
    user_dict["level_info"] = user.level_info
    
    return user_dict

# Add new endpoint for user search
@router.get("/search", response_model=List[schemas.UserRead])
def search_users(
    q: str, 
    limit: int = 10, 
    db: Session = Depends(get_db), 
    request: Request = None
):
    """Search users by username or display name (case-insensitive partial match)"""
    if not q or len(q.strip()) < 2:
        return []
    
    search_term = f"%{q.strip().lower()}%"
    
    # Search by username or display name
    users = db.query(User).filter(
        (User.username.ilike(search_term)) | 
        (User.display_name.ilike(search_term))
    ).limit(limit).all()
    
    # Convert to response format with absolute URLs
    results = []
    for user in users:
        user_dict = user.__dict__.copy()
        if user_dict.get("profile_picture_url"):
            user_dict["profile_picture_url"] = build_absolute_photo_url(request, user_dict["profile_picture_url"])
        results.append(user_dict)
    
    return results

# Get user profile by ID
@router.get("/{user_id}", response_model=schemas.UserProfile)
def get_user_profile(
    user_id: int,
    db: Session = Depends(get_db),
    request: Request = None
):
    logger.info("="*50)
    logger.info(f"GET /users/{user_id} endpoint called")
    user = crud.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get the stats explicitly
    user_stats = user.stats
    logger.info(f"User stats: {user_stats}")

    # Manually construct the response to match UserProfile schema
    user_profile = schemas.UserProfile(
        id=user.id,
        username=user.username,
        email=user.email,
        bio=user.bio,
        profile_picture_url=build_absolute_photo_url(request, user.profile_picture_url),
        latitude=user.latitude,
        longitude=user.longitude,
        display_name=user.display_name,
        stats=user_stats  # Explicitly include the stats
    )
    
    # Add level info to the response
    user_profile.level_info = user.level_info
    
    logger.info(f"Returning user profile for user_id: {user_id}")
    logger.info("="*50)
    return user_profile

# Follow/Unfollow user
@router.post("/{user_id}/follow", status_code=status.HTTP_200_OK)
def follow_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.UserRead = Depends(utils.get_current_user)
):
    logger.info(f"User {current_user.username} attempting to follow/unfollow user ID: {user_id}")
    if user_id == current_user.id:
        logger.warning(f"User {current_user.username} attempted to follow themselves")
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
    
    result = crud.toggle_follow(db, current_user.id, user_id)
    
    if result:
        # Successfully followed
        return {"status": "followed"}
    else:
        # Successfully unfollowed
        return {"status": "unfollowed"}

# Get user's followers
@router.get("/{user_id}/followers", response_model=List[schemas.UserRead])
def get_user_followers(
    user_id: int,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    return crud.get_user_followers(db, user_id, skip=skip, limit=limit)

# Get user's following
@router.get("/{user_id}/following", response_model=List[schemas.UserRead])
def get_user_following(
    user_id: int,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    return crud.get_user_following(db, user_id, skip=skip, limit=limit)

# Get user's posts
@router.get("/{user_id}/posts", response_model=List[schemas.PostRead])
def get_user_posts(
    user_id: int,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    request: Request = None
):
    posts = crud.get_user_posts(db, user_id, skip=skip, limit=limit)
    for post in posts:
        post.photo_url = build_absolute_photo_url(request, post.photo_url)
    return posts

# Get user's stats
@router.get("/{user_id}/stats", response_model=schemas.UserStats)
def get_user_stats(
    user_id: int,
    db: Session = Depends(get_db)
):
    user = crud.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user.stats

# Get notifications for current user
@router.get("/notifications/", response_model=List[NotificationRead])
def get_notifications(
    db: Session = Depends(get_db),
    current_user: schemas.UserRead = Depends(utils.get_current_user),
    request: Request = None
):
    notifs = db.query(Notification).filter(Notification.user_id == current_user.id).order_by(Notification.created_at.desc()).all()
    # Eager load post and actor, and patch post.photo_url to absolute
    for n in notifs:
        # Eagerly load related objects to avoid separate queries
        _ = n.actor
        if n.post:
            _ = n.post
            if n.post.photo_url:
                n.post.photo_url = build_absolute_photo_url(request, n.post.photo_url)
    return notifs

@router.get("/notifications/unread-count", response_model=int)
def get_unread_notifications_count(
    db: Session = Depends(get_db),
    current_user: schemas.UserRead = Depends(utils.get_current_user)
):
    """Get the count of unread notifications for the current user."""
    count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).count()
    return count

@router.put("/notifications/{notification_id}/read", response_model=NotificationRead)
def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.UserRead = Depends(utils.get_current_user)
):
    notification = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    if notification.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You are not authorized to mark this notification as read")
    notification.is_read = True
    db.commit()
    return notification

@router.put("/notifications/read-all", status_code=status.HTTP_204_NO_CONTENT)
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: schemas.UserRead = Depends(utils.get_current_user)
):
    """Mark all notifications for the current user as read."""
    crud.mark_all_notifications_as_read(db, current_user.id)
    return 