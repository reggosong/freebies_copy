from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from app import schemas, crud, utils
from app.db import get_db
from app.models.post import PostCategory, Post
from app.models.interaction import Comment, Like, GotIt
import shutil
import os
from datetime import datetime
from pydantic import ValidationError
import logging
from sqlalchemy.sql import func

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/posts", tags=["posts"])

# Helper to build absolute URL for photo
def build_absolute_photo_url(request: Request, photo_url: str) -> str:
    if photo_url.startswith('http'):  # already absolute
        return photo_url
    base_url = str(request.base_url).rstrip('/')
    return f"{base_url}/{photo_url}".replace('//', '/')

# Create post with photo upload
@router.post("/", response_model=schemas.PostRead)
async def create_post(
    request: Request,
    title: str = Form(...),
    description: str = Form(...),
    category: PostCategory = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    address: str = Form(...),
    photo: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: schemas.UserRead = Depends(utils.get_current_user)
):
    logger.info(f"Creating post for user: {current_user.username}")
    # Save photo
    photo_path = f"uploads/posts/{datetime.now().strftime('%Y%m%d_%H%M%S')}_{photo.filename}"
    os.makedirs(os.path.dirname(photo_path), exist_ok=True)
    with open(photo_path, "wb") as buffer:
        shutil.copyfileobj(photo.file, buffer)
    post_data = schemas.PostCreate(
        title=title,
        description=description,
        category=category,
        latitude=latitude,
        longitude=longitude,
        address=address,
        photo_url=photo_path
    )
    post = crud.create_post(db, post_data, current_user.id)
    # Patch photo_url to be absolute
    post.photo_url = build_absolute_photo_url(request, post.photo_url)
    return post

# Add search endpoint for posts
@router.get("/search", response_model=List[schemas.PostRead])
def search_posts(
    q: str,
    skip: int = 0,
    limit: int = 20,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    request: Request = None,
):
    """Search posts by title or description (case-insensitive partial match)"""
    if not q or len(q.strip()) < 2:
        return []
    
    search_term = f"%{q.strip().lower()}%"
    
    query = db.query(Post).filter(
        (Post.title.ilike(search_term)) | 
        (Post.description.ilike(search_term))
    )
    
    if category:
        query = query.filter(Post.category == category)
    
    posts = query.offset(skip).limit(limit).all()
    
    # Convert to response format with absolute URLs
    for post in posts:
        post.photo_url = build_absolute_photo_url(request, post.photo_url)
    
    return posts

# Get post by ID
@router.get("/{post_id}", response_model=schemas.PostRead)
def get_post(post_id: int, request: Request, db: Session = Depends(get_db)):
    post = crud.get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    post.photo_url = build_absolute_photo_url(request, post.photo_url)
    return post

# Get feed with filters
@router.get("/", response_model=List[schemas.PostRead])
def get_feed(
    request: Request,
    skip: int = 0,
    limit: int = 20,
    category: Optional[PostCategory] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    radius: Optional[float] = None,  # in kilometers
    following_only: bool = False,
    db: Session = Depends(get_db),
    current_user: schemas.UserRead = Depends(utils.get_current_user)
):
    posts = crud.get_feed(
        db,
        current_user.id,
        skip=skip,
        limit=limit,
        category=category,
        latitude=latitude,
        longitude=longitude,
        radius=radius,
        following_only=following_only
    )
    for post in posts:
        post.photo_url = build_absolute_photo_url(request, post.photo_url)
    return posts

# Update post
@router.put("/{post_id}", response_model=schemas.PostRead)
async def update_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.UserRead = Depends(utils.get_current_user),
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    category: Optional[PostCategory] = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    address: Optional[str] = Form(None),
    city: Optional[str] = Form(None),
    photo: Optional[UploadFile] = File(None)
):
    db_post = crud.get_post(db, post_id)
    if not db_post:
        raise HTTPException(status_code=404, detail="Post not found")
    if db_post.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this post")

    update_data = {
        "title": title,
        "description": description,
        "category": category,
        "latitude": latitude,
        "longitude": longitude,
        "address": address,
        "city": city,
    }

    if photo:
        photo_path = f"uploads/posts/{datetime.now().strftime('%Y%m%d_%H%M%S')}_{photo.filename}"
        os.makedirs(os.path.dirname(photo_path), exist_ok=True)
        with open(photo_path, "wb") as buffer:
            shutil.copyfileobj(photo.file, buffer)
        update_data["photo_url"] = photo_path

    # Filter out None values so we only update provided fields
    update_data_filtered = {k: v for k, v in update_data.items() if v is not None}
    
    if not update_data_filtered:
        return db_post # Or raise an exception if no data is provided

    post_update_schema = schemas.PostUpdate(**update_data_filtered)
    return crud.update_post(db, post_id, post_update_schema)

# Delete a post
@router.delete("/{post_id}", response_model=schemas.PostRead)
def delete_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.UserRead = Depends(utils.get_current_user)
):
    post = crud.get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this post")
    crud.delete_post(db, post_id)
    return post

# Like/Unlike post
@router.post("/{post_id}/like", response_model=schemas.PostRead)
def like_post(
    post_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: schemas.UserRead = Depends(utils.get_current_user)
):
    crud.toggle_like(db, post_id, current_user.id)
    post = crud.get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    post.photo_url = build_absolute_photo_url(request, post.photo_url)
    return post

# Comment on post
@router.post("/{post_id}/comment", response_model=schemas.CommentRead)
def comment_post(
    post_id: int,
    comment: schemas.CommentCreate,
    db: Session = Depends(get_db),
    current_user: schemas.UserRead = Depends(utils.get_current_user)
):
    return crud.create_comment(db, post_id, current_user.id, comment)

# Mark post as "Got it"
@router.post("/{post_id}/got-it", response_model=schemas.PostRead)
def got_it_post(
    post_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: schemas.UserRead = Depends(utils.get_current_user)
):
    crud.toggle_got_it(db, post_id, current_user.id)
    post = crud.get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    post.photo_url = build_absolute_photo_url(request, post.photo_url)
    return post

# Get users who liked a post
@router.get("/{post_id}/likes", response_model=List[schemas.UserRead])
def get_post_likes(post_id: int, db: Session = Depends(get_db)):
    post = crud.get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return [like.user for like in post.likes]

# Get users who got it for a post
@router.get("/{post_id}/got-it", response_model=List[schemas.UserRead])
def get_post_got_it(post_id: int, db: Session = Depends(get_db)):
    post = crud.get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return [got_it.user for got_it in post.got_it]

# Get comments for a post
@router.get("/{post_id}/comments", response_model=List[schemas.CommentRead])
def get_post_comments(post_id: int, db: Session = Depends(get_db)):
    post = crud.get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post.comments

# Delete a comment
@router.delete("/comments/{comment_id}")
def delete_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.UserRead = Depends(utils.get_current_user)
):
    success = crud.delete_comment(db, comment_id, current_user.id)
    if not success:
        raise HTTPException(status_code=403, detail="Not authorized or comment not found")
    return {"detail": "Comment deleted"}

@router.post("/{post_id}/hide", status_code=status.HTTP_200_OK)
def hide_post_from_feed(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.UserRead = Depends(utils.get_current_user)
):
    post = crud.get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    crud.hide_post(db, user_id=current_user.id, post_id=post_id)
    return {"message": "Post hidden successfully"}

@router.delete("/{post_id}/hide", status_code=status.HTTP_200_OK)
def unhide_post_from_feed(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.UserRead = Depends(utils.get_current_user)
):
    post = crud.get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    result = crud.unhide_post(db, user_id=current_user.id, post_id=post_id)
    if not result:
        raise HTTPException(status_code=404, detail="Post was not hidden")
    return {"message": "Post unhidden successfully"}

@router.get("/{post_id}/hidden-status")
def get_post_hidden_status(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.UserRead = Depends(utils.get_current_user)
):
    post = crud.get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    is_hidden = crud.is_post_hidden(db, user_id=current_user.id, post_id=post_id)
    return {"is_hidden": is_hidden}

@router.post("/{post_id}/report-gone", response_model=schemas.PostRead)
async def report_post_as_gone(
    post_id: int,
    latitude: float = Form(...),
    longitude: float = Form(...),
    photo: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: schemas.UserRead = Depends(utils.get_current_user)
):
    post = crud.get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    # Verify user location is close to the post location
    distance = crud.haversine_distance(latitude, longitude, post.latitude, post.longitude)
    if distance > 0.1: # 0.1 km = 100 meters
        raise HTTPException(
            status_code=403,
            detail=f"You must be within 100 meters of the item to report it as gone. You are {int(distance * 1000)} meters away."
        )

    # Save new photo
    photo_path = f"uploads/posts/{datetime.now().strftime('%Y%m%d_%H%M%S')}_{photo.filename}"
    os.makedirs(os.path.dirname(photo_path), exist_ok=True)
    with open(photo_path, "wb") as buffer:
        shutil.copyfileobj(photo.file, buffer)

    # Update post
    updated_description = f"Reported all gone by {current_user.username}.\n\n{post.description}"
    update_data = schemas.PostUpdate(
        photo_url=photo_path,
        description=updated_description,
        is_gone=True
    )
    
    updated_post = crud.update_post(db, post_id, update_data)
    return updated_post 