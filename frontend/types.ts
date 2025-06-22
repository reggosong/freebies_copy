export interface Post {
  id: number;
  title: string;
  description: string;
  category: string;
  latitude: number;
  longitude: number;
  photo_url: string;
  owner_id: number;
  created_at: string;
  updated_at: string;
  owner: User;
  likesCount: number;
  commentsCount: number;
  gotItCount: number;
  address: string | null;
  city: string | null;
  is_gone: boolean;
}

export interface User {
  id: number;
  // ... existing code ...
}
