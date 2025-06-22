# Freebies Backend API

This is the backend API for the Freebies app, a platform for sharing and finding free food.

## Setup Instructions

1. Create a virtual environment:

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Create a `.env` file in the Backend directory with the following content:

```
DATABASE_URL=sqlite:///./freebies.db
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

4. Run the application:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

## API Documentation

Once the server is running, you can access:

- Interactive API documentation (Swagger UI): `http://localhost:8000/docs`
- Alternative API documentation (ReDoc): `http://localhost:8000/redoc`

## Testing with Postman

1. Import the following collection into Postman:

```json
{
  "info": {
    "name": "Freebies API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Authentication",
      "item": [
        {
          "name": "Sign Up",
          "request": {
            "method": "POST",
            "url": "http://localhost:8000/auth/signup",
            "body": {
              "mode": "raw",
              "raw": "{\n    \"username\": \"testuser\",\n    \"email\": \"test@example.com\",\n    \"password\": \"password123\"\n}",
              "options": {
                "raw": {
                  "language": "json"
                }
              }
            }
          }
        },
        {
          "name": "Login",
          "request": {
            "method": "POST",
            "url": "http://localhost:8000/auth/login",
            "body": {
              "mode": "raw",
              "raw": "{\n    \"username\": \"testuser\",\n    \"password\": \"password123\"\n}",
              "options": {
                "raw": {
                  "language": "json"
                }
              }
            }
          }
        }
      ]
    }
  ]
}
```

2. After login, you'll receive a JWT token. Use this token in the Authorization header for subsequent requests:

```
Authorization: Bearer <your_token>
```

## Available Endpoints

### Authentication

- POST `/auth/signup` - Create a new user account
- POST `/auth/login` - Login and get access token

### Posts

- POST `/posts` - Create a new post (with photo)
- GET `/posts` - Get feed with filters
- GET `/posts/{post_id}` - Get specific post
- PUT `/posts/{post_id}` - Update post
- DELETE `/posts/{post_id}` - Delete post
- POST `/posts/{post_id}/like` - Like/Unlike post
- POST `/posts/{post_id}/comment` - Comment on post
- POST `/posts/{post_id}/got-it` - Mark post as "Got it"

### Users

- GET `/users/me` - Get current user profile
- PUT `/users/me` - Update current user profile
- GET `/users/{user_id}` - Get user profile
- POST `/users/{user_id}/follow` - Follow/Unfollow user
- GET `/users/{user_id}/followers` - Get user's followers
- GET `/users/{user_id}/following` - Get user's following
- GET `/users/{user_id}/posts` - Get user's posts
- GET `/users/{user_id}/stats` - Get user's stats

### Messages

- GET `/messages` - Get inbox
- PUT `/messages/{message_id}/read` - Mark message as read
- PUT `/messages/read-all` - Mark all messages as read
- DELETE `/messages/{message_id}` - Delete message
- GET `/messages/unread/count` - Get unread message count

## File Upload

For endpoints that require file upload (like creating a post with a photo):

1. Use form-data in Postman
2. Add the file in the "photo" field
3. Add other fields as needed

## Error Handling

The API uses standard HTTP status codes:

- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

Error responses include a detail message explaining the error.

## Backend Stack and Frameworks

- **Language:** Python
- **Framework:** FastAPI
- **Database:** SQLite (via SQLAlchemy ORM)
- **Authentication:** JWT (JSON Web Tokens)
- **File Upload:** FastAPI's built-in file handling
- **CORS:** FastAPI's CORS middleware
- **API Documentation:** Swagger UI and ReDoc
