from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from app.routes import auth, posts, users, messages
from app.db import engine
from app.models import user, post, follow, interaction, message

# Create necessary directories
os.makedirs("uploads/posts", exist_ok=True)
os.makedirs("uploads/profiles", exist_ok=True)

# Create database tables
user.Base.metadata.create_all(bind=engine)
post.Base.metadata.create_all(bind=engine)
follow.Base.metadata.create_all(bind=engine)
interaction.Base.metadata.create_all(bind=engine)
message.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Freebies API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for uploaded images
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Include routers
app.include_router(auth.router)
app.include_router(posts.router)
app.include_router(users.router)
app.include_router(messages.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to Freebies API"} 