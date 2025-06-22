import axios from "axios";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { API_URL } from "../app.config";

export { API_URL };

// Get the API URL from configuration
console.log("API URL:", API_URL);

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000, // 10 second timeout
  // headers: {
  //   "Content-Type": "application/json",
  // },
});

// Add request interceptor for debugging
api.interceptors.request.use(
  async (config) => {
    // Only set Content-Type if not FormData
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    } else if (config.url && config.url.includes("/auth/login")) {
      config.headers["Content-Type"] = "application/x-www-form-urlencoded";
    } else if (config.method && config.method.toLowerCase() !== "get") {
      config.headers["Content-Type"] = "application/json";
    } else {
      delete config.headers["Content-Type"];
    }
    config.headers["Accept"] = "*/*";
    console.log("Making request to:", config.url);
    console.log("Request config:", {
      method: config.method,
      headers: config.headers,
      data: config.data,
    });

    const token = await SecureStore.getItemAsync("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log("[API] Using Bearer token:", token);
    } else {
      console.log("[API] No Bearer token found in SecureStore");
    }
    return config;
  },
  (error) => {
    console.error("[API Request Error]", error);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log("Response received:", {
      status: response.status,
      data: response.data,
    });
    return response;
  },
  async (error) => {
    // Handle network errors
    if (!error.response) {
      console.error("[API Network Error]", error.message);
      return Promise.reject(
        new Error("Network error. Please check your connection.")
      );
    }

    // Log the error details
    console.error("[API Response Error]", {
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
      method: error.config?.method,
    });

    // Handle specific error cases
    switch (error.response.status) {
      case 401:
        // For login requests, show invalid credentials error
        if (error.config?.url?.includes("/auth/login")) {
          return Promise.reject(new Error("Invalid username or password"));
        }
        // For other requests, treat as session expired
        await SecureStore.deleteItemAsync("access_token");
        return Promise.reject(
          new Error("Session expired. Please log in again.")
        );

      case 403:
        return Promise.reject(
          new Error("You don't have permission to perform this action.")
        );

      case 404:
        return Promise.reject(
          new Error("The requested resource was not found.")
        );

      case 500:
        return Promise.reject(
          new Error("An unexpected error occurred. Please try again later.")
        );

      default:
        // For other errors, use the server's error message if available
        const errorMessage =
          error.response?.data?.detail ||
          error.response?.data?.message ||
          "An unexpected error occurred";
        return Promise.reject(new Error(errorMessage));
    }
  }
);

export default api;

// Follow a user
export async function followUser(userId: number) {
  return api.post(`/users/${userId}/follow`);
}

// Unfollow a user
export async function unfollowUser(userId: number) {
  return api.post(`/users/${userId}/unfollow`);
}

// Get followers of a user
export async function getFollowers(userId: number) {
  return api.get(`/users/${userId}/followers`);
}

// Get users the user is following
export async function getFollowing(userId: number) {
  return api.get(`/users/${userId}/following`);
}

// Like a post
export async function likePost(postId: number) {
  return api.post(`/posts/${postId}/like`);
}

// Comment on a post
export async function commentPost(
  postId: number,
  comment: { content: string }
) {
  return api.post(`/posts/${postId}/comment`, comment);
}

// Mark post as 'Got it'
export async function gotItPost(postId: number) {
  return api.post(`/posts/${postId}/got-it`);
}

// Get user stats
export async function getUserStats(userId: number) {
  return api.get(`/users/${userId}/stats`);
}

// Get user notifications/messages
export async function getUserNotifications() {
  return api.get("/notifications");
}

// Search user by username
export async function searchUserByUsername(username: string) {
  return api.get(`/users/lookup?username=${encodeURIComponent(username)}`);
}

// Delete a post
export async function deletePost(postId: number) {
  return api.delete(`/posts/${postId}`);
}

// Hide a post from feed
export async function hidePost(postId: number) {
  return api.post(`/posts/${postId}/hide`);
}

// Unhide a post from feed
export async function unhidePost(postId: number) {
  return api.delete(`/posts/${postId}/hide`);
}

// Get post hidden status
export async function getPostHiddenStatus(postId: number) {
  return api.get(`/posts/${postId}/hidden-status`);
}

export function getFullImageUrl(
  url: string | null | undefined
): string | undefined {
  if (!url) return undefined;

  // If it's already a full URL, encode it
  if (url.startsWith("http")) {
    try {
      const urlObj = new URL(url);
      return urlObj.toString();
    } catch {
      // If URL parsing fails, try basic encoding
      return encodeURI(url);
    }
  }

  // For relative URLs, ensure they start with uploads/
  const path = url.startsWith("uploads/")
    ? url
    : `uploads/${url.replace(/^\/+/, "")}`;

  try {
    const fullUrl = `${API_URL}/${path}`;
    const urlObj = new URL(fullUrl);
    return urlObj.toString();
  } catch {
    // If URL parsing fails, try basic encoding
    return encodeURI(`${API_URL}/${path}`);
  }
}

export function mapPostFromApi(apiPost: any): import("../types").Post {
  return {
    ...apiPost,
    likesCount: apiPost.likes_count,
    commentsCount: apiPost.comments_count,
    gotItCount: apiPost.got_it_count,
  };
}

export async function getNotifications() {
  const res = await api.get("/users/notifications/");
  return res.data;
}

export async function getUnreadNotificationCount() {
  const res = await api.get<number>("/users/notifications/unread-count");
  return res.data;
}

export async function markAllNotificationsAsRead() {
  await api.put("/users/notifications/read-all");
}

export async function markNotificationAsRead(notificationId: number) {
  // ... existing code ...
}
