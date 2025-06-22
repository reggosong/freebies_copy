from sqlalchemy import Column, Integer, String, ForeignKey, Text, DateTime, UniqueConstraint, Enum as SqlEnum, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db import Base
import enum

class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text)
    post_id = Column(Integer, ForeignKey("posts.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    post = relationship("Post", back_populates="comments")
    user = relationship("User", back_populates="comments")

class Like(Base):
    __tablename__ = "likes"
    __table_args__ = (UniqueConstraint('post_id', 'user_id', name='unique_like'),)

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    post = relationship("Post", back_populates="likes")
    user = relationship("User", back_populates="likes")

class GotIt(Base):
    __tablename__ = "got_it"
    __table_args__ = (UniqueConstraint('post_id', 'user_id', name='unique_got_it'),)

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id")) # The user who received it
    giver_id = Column(Integer, ForeignKey("users.id")) # The user who gave it
    created_at = Column(DateTime, default=datetime.utcnow)

    post = relationship("Post", back_populates="got_it")
    user = relationship("User", back_populates="got_it", foreign_keys=[user_id])
    giver = relationship("User", foreign_keys=[giver_id])

class HiddenPost(Base):
    __tablename__ = "hidden_posts"
    __table_args__ = (UniqueConstraint('user_id', 'post_id', name='unique_hidden_post'),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"))
    created_at = Column(DateTime, default=datetime.utcnow)

# Notification type enum
class NotificationType(enum.Enum):
    LIKE = "like"
    GOT_IT = "got_it"
    COMMENT = "comment"
    FOLLOW = "follow"

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))  # recipient
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=True)
    actor_id = Column(Integer, ForeignKey("users.id"))  # who triggered
    type = Column(SqlEnum(NotificationType))
    message = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_read = Column(Boolean, default=False)

    post = relationship("Post", back_populates="notifications")
    actor = relationship("User", foreign_keys=[actor_id]) 