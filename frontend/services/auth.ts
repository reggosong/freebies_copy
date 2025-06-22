import api from "./api";
import * as SecureStore from "expo-secure-store";
import {
  AuthResponse,
  LoginCredentials,
  RegisterCredentials,
  User,
} from "../types";

export async function login(
  credentials: LoginCredentials
): Promise<AuthResponse> {
  // Convert to URLSearchParams for form-urlencoded format
  const formData = new URLSearchParams();

  // Use the value for login (backend expects username)
  formData.append("username", credentials.username);
  formData.append("password", credentials.password);
  formData.append("grant_type", "password");

  try {
    console.log("Attempting login with:", {
      username: credentials.username,
      url: `${api.defaults.baseURL}/auth/login`,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    // First try to get the token
    const response = await api.post<{
      access_token: string;
      token_type: string;
    }>("/auth/login", formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    console.log("Login successful, response:", response.data);

    // Store the token
    await SecureStore.setItemAsync("access_token", response.data.access_token);

    // Fetch the real user data after login
    const userData = await getCurrentUser();

    return {
      access_token: response.data.access_token,
      token_type: response.data.token_type,
      user: userData,
    };
  } catch (error: any) {
    console.error("Login error details:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
      url: error.config?.url,
      baseURL: api.defaults.baseURL,
      stack: error.stack,
    });
    if (error.response?.status === 401) {
      throw new Error("Invalid username or password");
    }
    throw error;
  }
}

export async function register(
  credentials: RegisterCredentials
): Promise<AuthResponse> {
  try {
    console.log("Attempting registration with:", {
      username: credentials.username,
      email: credentials.email,
      url: `${api.defaults.baseURL}/auth/signup`,
    });

    // First register the user
    const registerResponse = await api.post<User>("/auth/signup", credentials);
    console.log("Registration successful:", registerResponse.data);

    // Then log them in to get the access token
    const loginCredentials: LoginCredentials = {
      username: credentials.username, // Use username for login
      password: credentials.password,
    };

    return login(loginCredentials);
  } catch (error: any) {
    console.error("Registration error details:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
      url: error.config?.url,
      baseURL: api.defaults.baseURL,
      stack: error.stack,
    });

    if (error.response?.status === 400) {
      const errorMessage =
        error.response?.data?.detail ||
        "Registration failed. Please check your input and try again.";
      throw new Error(errorMessage);
    }
    throw error;
  }
}

export async function logout(): Promise<void> {
  await SecureStore.deleteItemAsync("access_token");
}

export async function getCurrentUser() {
  const response = await api.get<User>("/auth/me");
  return response.data;
}
