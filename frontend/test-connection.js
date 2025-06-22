import axios from "axios";
import { API_URL } from "./app.config.ts";

async function testConnection() {
  console.log("Testing backend connection...");
  console.log("Using API URL:", API_URL);

  try {
    // 1. Test basic connection
    const response = await axios.get(`${API_URL}/`);
    console.log("✅ Backend is accessible");
    console.log("Response:", response.data);
  } catch (error) {
    console.error("❌ Backend is not accessible");
    console.error("Error:", error.message);
    return;
  }

  try {
    // 2. Test authentication endpoints
    console.log("\nTesting authentication endpoints...");

    // Test registration
    const registerResponse = await axios.post(`${API_URL}/auth/signup`, {
      username: "testuser",
      email: "test@example.com",
      password: "testpassword123",
    });
    console.log("✅ Registration endpoint is working");

    // Test login
    const loginResponse = await axios.post(
      `${API_URL}/auth/login`,
      new URLSearchParams({
        username: "test@example.com",
        password: "testpassword123",
        grant_type: "password",
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    console.log("✅ Login endpoint is working");

    const token = loginResponse.data.access_token;

    // Test protected endpoint
    const meResponse = await axios.get(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log("✅ Protected endpoint is working");

    // 3. Test main API endpoints
    console.log("\nTesting main API endpoints...");

    // Test posts endpoint
    const postsResponse = await axios.get(`${API_URL}/posts`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log("✅ Posts endpoint is working");

    // Test user posts endpoint
    const userPostsResponse = await axios.get(
      `${API_URL}/users/${meResponse.data.id}/posts`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    console.log("✅ User posts endpoint is working");

    console.log("\n✅ All tests passed successfully!");
  } catch (error) {
    console.error("❌ Test failed");
    console.error("Error:", error.response?.data || error.message);
  }
}

testConnection();
