import requests
import os
from datetime import datetime

BASE_URL = "http://localhost:8000"
test_user1 = {
    "username": f"testuser1_{datetime.now().strftime('%Y%m%d%H%M%S')}",
    "email": f"test1_{datetime.now().strftime('%Y%m%d%H%M%S')}@example.com",
    "password": "testpass123"
}
test_user2 = {
    "username": f"testuser2_{datetime.now().strftime('%Y%m%d%H%M%S')}",
    "email": f"test2_{datetime.now().strftime('%Y%m%d%H%M%S')}@example.com",
    "password": "testpass123"
}

def test_auth():
    print("\nTesting Authentication...")
    
    # Test signup
    print("Testing signup...")
    response = requests.post(f"{BASE_URL}/auth/signup", json=test_user1)
    assert response.status_code == 200
    user1_data = response.json()
    print("✓ Signup successful")
    
    # Test duplicate signup
    response = requests.post(f"{BASE_URL}/auth/signup", json=test_user1)
    assert response.status_code == 400
    print("✓ Duplicate signup prevented")
    
    # Test login
    print("Testing login...")
    response = requests.post(
        f"{BASE_URL}/auth/login",
        data={"username": test_user1["username"], "password": test_user1["password"]}
    )
    assert response.status_code == 200
    token1 = response.json()["access_token"]
    print("✓ Login successful")
    
    # Test invalid login
    response = requests.post(
        f"{BASE_URL}/auth/login",
        data={"username": test_user1["username"], "password": "wrongpass"}
    )
    assert response.status_code == 401
    print("✓ Invalid login prevented")
    
    return token1

def test_user_profile(token):
    print("\nTesting User Profile...")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test get profile
    print("Testing get profile...")
    response = requests.get(f"{BASE_URL}/users/me", headers=headers)
    assert response.status_code == 200
    print("✓ Get profile successful")
    
    # Test update profile
    print("Testing update profile...")
    update_data = {
        "bio": "Test bio",
        "latitude": 37.7749,
        "longitude": -122.4194
    }
    response = requests.put(f"{BASE_URL}/users/me", headers=headers, json=update_data)
    assert response.status_code == 200
    print("✓ Update profile successful")

def test_posts(token):
    print("\nTesting Posts...")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test create post
    print("Testing create post...")
    post_data = {
        "title": "Test Post",
        "description": "Test Description",
        "category": "leftovers",
        "latitude": 37.7749,
        "longitude": -122.4194,
        "content": "Test content for the post."
    }
    # Create a test image
    with open("test_image.jpg", "wb") as f:
        f.write(b"test image content")
    
    files = {"photo": ("test_image.jpg", open("test_image.jpg", "rb"), "image/jpeg")}
    response = requests.post(f"{BASE_URL}/posts/", headers=headers, data=post_data, files=files)
    assert response.status_code == 200
    post_id = response.json()["id"]
    print("✓ Create post successful")
    
    # Test get post
    print("Testing get post...")
    response = requests.get(f"{BASE_URL}/posts/{post_id}", headers=headers)
    assert response.status_code == 200
    print("✓ Get post successful")
    
    # Test like post
    print("Testing like post...")
    response = requests.post(f"{BASE_URL}/posts/{post_id}/like", headers=headers)
    assert response.status_code == 200
    print("✓ Like post successful")
    
    # Test comment on post
    print("Testing comment on post...")
    comment_data = {"content": "Test comment"}
    response = requests.post(f"{BASE_URL}/posts/{post_id}/comment", headers=headers, json=comment_data)
    assert response.status_code == 200
    print("✓ Comment on post successful")
    
    # Test mark as "Got it"
    print("Testing mark as 'Got it'...")
    response = requests.post(f"{BASE_URL}/posts/{post_id}/got-it", headers=headers)
    assert response.status_code == 200
    print("✓ Mark as 'Got it' successful")
    
    # Clean up test image
    os.remove("test_image.jpg")

def test_post_missing_content(token):
    print("\nTesting post creation with missing content...")
    headers = {"Authorization": f"Bearer {token}"}
    post_data = {
        "title": "Test Post Missing Content",
        "description": "Test Description",
        "category": "leftovers",
        "latitude": 37.7749,
        "longitude": -122.4194
        # 'content' is intentionally omitted
    }
    with open("test_image.jpg", "wb") as f:
        f.write(b"test image content")
    files = {"photo": ("test_image.jpg", open("test_image.jpg", "rb"), "image/jpeg")}
    response = requests.post(f"{BASE_URL}/posts/", headers=headers, data=post_data, files=files)
    assert response.status_code == 400
    assert "Please enter content for your post." in response.text
    print("✓ Properly handled missing content with user-friendly message")
    os.remove("test_image.jpg")

def test_following(token1, token2):
    print("\nTesting Following System...")
    headers1 = {"Authorization": f"Bearer {token1}"}
    headers2 = {"Authorization": f"Bearer {token2}"}
    
    # Get user2's ID
    response = requests.get(f"{BASE_URL}/users/me", headers=headers2)
    user2_id = response.json()["id"]
    
    # Test follow
    print("Testing follow...")
    response = requests.post(f"{BASE_URL}/users/{user2_id}/follow", headers=headers1)
    assert response.status_code == 200
    print("✓ Follow successful")
    
    # Test get followers
    print("Testing get followers...")
    response = requests.get(f"{BASE_URL}/users/{user2_id}/followers", headers=headers1)
    assert response.status_code == 200
    print("✓ Get followers successful")
    
    # Test get following
    print("Testing get following...")
    response = requests.get(f"{BASE_URL}/users/{user2_id}/following", headers=headers1)
    assert response.status_code == 200
    print("✓ Get following successful")

def test_messages(token1, token2):
    print("\nTesting Messages...")
    headers1 = {"Authorization": f"Bearer {token1}"}
    headers2 = {"Authorization": f"Bearer {token2}"}
    
    # Get user2's ID
    response = requests.get(f"{BASE_URL}/users/me", headers=headers2)
    user2_id = response.json()["id"]
    
    # Test get inbox
    print("Testing get inbox...")
    response = requests.get(f"{BASE_URL}/messages/", headers=headers1)
    assert response.status_code == 200
    print("✓ Get inbox successful")
    
    # Test get unread count
    print("Testing get unread count...")
    response = requests.get(f"{BASE_URL}/messages/unread/count", headers=headers1)
    assert response.status_code == 200
    print("✓ Get unread count successful")

def main():
    print("Starting backend tests...")
    
    # Test authentication
    token1 = test_auth()
    
    # Create second user for testing interactions
    response = requests.post(f"{BASE_URL}/auth/signup", json=test_user2)
    assert response.status_code == 200
    response = requests.post(
        f"{BASE_URL}/auth/login",
        data={"username": test_user2["username"], "password": test_user2["password"]}
    )
    token2 = response.json()["access_token"]
    
    # Test user profile
    test_user_profile(token1)
    
    # Test posts
    test_posts(token1)
    
    # Test missing content
    test_post_missing_content(token1)
    
    # Test following system
    test_following(token1, token2)
    
    # Test messages
    test_messages(token1, token2)
    
    print("\nAll tests completed successfully!")

if __name__ == "__main__":
    main() 