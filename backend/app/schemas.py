from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime
from app.models.post import PostCategory
from app.models.message import MessageType

# User schemas
class UserBase(BaseModel):
    username: str
    email: EmailStr

class UserCreate(UserBase):
    password: str

class LevelInfo(BaseModel):
    level: int
    badge: str
    title: str
    total_score: int
    progress: float
    next_level: Optional[int] = None
    next_title: Optional[str] = None

class UserRead(UserBase):
    id: int
    bio: Optional[str] = None
    profile_picture_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    display_name: Optional[str] = None
    level_info: Optional[LevelInfo] = None

    class Config:
        from_attributes = True

class UserProfile(UserRead):
    stats: dict
    level_info: Optional[LevelInfo] = None

class UserStats(BaseModel):
    posts: int
    got_it: int
    gave: int

# Post schemas
class PostBase(BaseModel):
    title: str
    description: str
    category: PostCategory
    latitude: float
    longitude: float
    photo_url: str
    address: Optional[str] = None
    city: Optional[str] = None

class PostCreate(PostBase):
    pass

class PostUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[PostCategory] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    photo_url: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    is_gone: Optional[bool] = None

class PostRead(PostBase):
    id: int
    owner_id: int
    created_at: datetime
    updated_at: datetime
    owner: UserRead
    likes_count: int
    comments_count: int
    got_it_count: int
    is_gone: bool
    city: Optional[str] = None

    class Config:
        orm_mode = True

# Interaction schemas
class CommentBase(BaseModel):
    content: str

class CommentCreate(CommentBase):
    pass

class CommentRead(CommentBase):
    id: int
    post_id: int
    user_id: int
    created_at: datetime
    user: UserRead

    class Config:
        orm_mode = True

class LikeRead(BaseModel):
    id: int
    post_id: int
    user_id: int
    created_at: datetime
    user: UserRead

    class Config:
        orm_mode = True

class GotItRead(BaseModel):
    id: int
    post_id: int
    user_id: int
    created_at: datetime
    user: UserRead

    class Config:
        orm_mode = True

# Follow schema
class FollowRead(BaseModel):
    id: int
    follower_id: int
    following_id: int
    created_at: datetime
    follower: UserRead
    following: UserRead

    class Config:
        orm_mode = True

# Message schemas
class MessageBase(BaseModel):
    type: MessageType
    content: Optional[str] = None
    post_id: Optional[int] = None

class MessageCreate(MessageBase):
    receiver_id: int

class MessageRead(MessageBase):
    id: int
    sender_id: int
    receiver_id: int
    created_at: datetime
    read: bool
    sender: UserRead
    receiver: UserRead
    post: Optional[PostRead] = None

    class Config:
        from_attributes = True

class MessageCount(BaseModel):
    total: int
    by_type: dict

# Token schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class NotificationRead(BaseModel):
    id: int
    user_id: int
    post_id: Optional[int]
    actor_id: int
    type: str
    message: str
    created_at: datetime
    post: Optional[PostRead]
    actor: Optional[UserRead]

    class Config:
        orm_mode = True

class HiddenPost(BaseModel):
    user_id: int
    post_id: int

class HiddenPostRead(HiddenPost):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True 