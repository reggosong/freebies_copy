export interface User {
  id: number;
  email: string;
  username: string;
  created_at?: string;
  followers?: User[];
  following?: User[];
  profile_picture_url?: string;
  display_name?: string;
  bio?: string;
  stats?: {
    posts: number;
    got_it: number;
    gave: number;
  };
  level_info?: {
    level: number;
    badge: string;
    title: string;
    total_score: number;
    progress: number;
    next_level?: number;
    next_title?: string;
  };
}

export interface Post {
  id: number;
  title: string;
  description: string;
  category: "leftovers" | "new" | "restaurant" | "home_made";
  latitude: number;
  longitude: number;
  photo_url: string;
  owner_id: number;
  created_at: string;
  updated_at: string;
  owner: User;
  likesCount?: number;
  commentsCount?: number;
  gotItCount?: number;
  address?: string;
  city?: string;
  is_gone?: boolean;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  followers?: User[];
  following?: User[];
  unreadCount: number;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  fetchFollowers?: (userId: number) => Promise<void>;
  fetchFollowing?: (userId: number) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  follow?: (userId: number) => Promise<void>;
  unfollow?: (userId: number) => Promise<void>;
  setUser: (user: User) => void;
}
