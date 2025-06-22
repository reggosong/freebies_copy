import { create } from "zustand";
import { AuthState, LoginCredentials, RegisterCredentials, User } from "../types";
import * as authService from "../services/auth";
import { getUnreadNotificationCount } from "../services/api";

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  error: null,
  followers: [],
  following: [],
  unreadCount: 0,

  fetchUnreadCount: async () => {
    try {
      const count = await getUnreadNotificationCount();
      set({ unreadCount: count });
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
    }
  },

  setUser: (user: User) => set({ user }),

  login: async (credentials: LoginCredentials) => {
    try {
      set({ isLoading: true, error: null });
      const response = await authService.login(credentials);
      console.log("Login successful, user data:", response.user);
      set({
        user: response.user,
        token: response.access_token,
        isLoading: false,
        error: null,
      });
      get().fetchUnreadCount();
    } catch (error) {
      console.error("Login error in store:", error);
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  register: async (credentials: RegisterCredentials) => {
    try {
      set({ isLoading: true, error: null });
      const response = await authService.register(credentials);
      console.log("Registration successful, user data:", response.user);
      set({
        user: response.user,
        token: response.access_token,
        isLoading: false,
        error: null,
      });
      get().fetchUnreadCount();
    } catch (error) {
      console.error("Registration error in store:", error);
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      set({ isLoading: true, error: null });
      await authService.logout();
      set({ user: null, token: null, isLoading: false, error: null });
    } catch (error) {
      console.error("Logout error in store:", error);
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  fetchFollowers: async (userId: number) => {
    try {
      const response = await import('../services/api').then(m => m.getFollowers(userId));
      set({ followers: response.data });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  fetchFollowing: async (userId: number) => {
    try {
      const response = await import('../services/api').then(m => m.getFollowing(userId));
      set({ following: response.data });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  follow: async (userId: number) => {
    try {
      await import('../services/api').then(m => m.followUser(userId));
      const currentUserId = get().user?.id;
      if (currentUserId) {
        get().fetchFollowing?.(currentUserId);
      }
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  unfollow: async (userId: number) => {
    try {
      await import('../services/api').then(m => m.followUser(userId));
      const currentUserId = get().user?.id;
      if (currentUserId) {
        get().fetchFollowing?.(currentUserId);
      }
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },
}));
