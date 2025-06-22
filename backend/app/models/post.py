from sqlalchemy import Column, Integer, String, ForeignKey, Text, DateTime, Float, Enum, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.db import Base

class PostCategory(enum.Enum):
    LEFTOVERS = "leftovers"
    NEW = "new"
    RESTAURANT = "restaurant"
    HOME_MADE = "home_made"

class Post(Base):
    __tablename__ = "posts"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    description = Column(String)
    category = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    address = Column(String, nullable=True)
    photo_url = Column(String)
    owner_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_gone = Column(Boolean, default=False)

    owner = relationship("User", back_populates="posts")
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")
    likes = relationship("Like", back_populates="post", cascade="all, delete-orphan")
    got_it = relationship("GotIt", back_populates="post", cascade="save-update")
    messages = relationship("Message", back_populates="post", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="post", cascade="all, delete-orphan")

    @property
    def likes_count(self):
        return len(self.likes) if self.likes else 0

    @property
    def comments_count(self):
        return len(self.comments) if self.comments else 0

    @property
    def got_it_count(self):
        return len(self.got_it) if self.got_it else 0

    @property
    def city(self):
        if not self.address:
            return None
        parts = [p.strip() for p in self.address.split(',')]
        # Remove empty, numeric (zip), and irrelevant parts
        filtered = [p for p in parts if p and not p.isdigit() and 'county' not in p.lower() and 'united states' not in p.lower()]
        # State abbreviation mapping
        state_abbr = {
            'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA', 'colorado': 'CO',
            'connecticut': 'CT', 'delaware': 'DE', 'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
            'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA',
            'maine': 'ME', 'maryland': 'MD', 'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN',
            'mississippi': 'MS', 'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
            'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC',
            'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA',
            'rhode island': 'RI', 'south carolina': 'SC', 'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX',
            'utah': 'UT', 'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
            'wisconsin': 'WI', 'wyoming': 'WY'
        }
        city = None
        state = None
        for i in range(len(filtered)-1):
            part = filtered[i]
            next_part = filtered[i+1]
            # Heuristic: city is not a state abbreviation, state is 2-letter or full state name
            if len(next_part) == 2 and next_part.isalpha():
                city = part
                state = next_part.upper()
                break
            # Or, if state is a full name (e.g., 'Washington')
            state_lower = next_part.lower()
            if state_lower in state_abbr:
                city = part
                state = state_abbr[state_lower]
                break
        if city and state:
            return f"{city}, {state}"
        # Fallback: return first non-numeric, non-county part
        for part in filtered:
            if not part.isdigit():
                return part
        return self.address.strip() 