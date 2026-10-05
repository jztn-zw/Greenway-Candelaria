// src/services/authService.ts
import api from "@/lib/api";
import { getAuthStorage } from "@/lib/authStorage";

export interface RegisterData {
  full_name: string;
  username: string;
  email: string;
  password: string;
  phone?: string;
  barangay_id?: string;
  street_id?: string;
}

export interface LoginData {
  identifier: string;
  password: string;
}

export interface User {
  id: string;
  full_name: string;
  username: string;
  email: string;
  role: string;
  status: string;
  avatar_url: string | null;
  barangay_id: string | null;
  barangay_name?: string | null;
  street_id?: string | null;
  street_name?: string | null;
  street_area?: string | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}

const authService = {
  register: async (data: RegisterData) => {
    const response = await api.post("/auth/register", data);
    return response.data;
  },

  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await api.post("/auth/login", data);
    const { token, user } = response.data.data;

    return { token, user };
  },

  logout: async () => {
    await api.post("/auth/logout");
  },

  getMe: async (): Promise<User> => {
    const response = await api.get("/auth/me");
    return response.data.data;
  },

  // Ignore corrupted or tampered browser storage.
  getCurrentUser: (): User | null => {
    try {
      const user = getAuthStorage().getItem("user");
      return user ? (JSON.parse(user) as User) : null;
    } catch {
      // If JSON.parse fails (corrupted data), clear and return null
      getAuthStorage().removeItem("user");
      return null;
    }
  },

  getToken: (): string | null => {
    return getAuthStorage().getItem("token");
  },

  isAuthenticated: (): boolean => {
    return !!getAuthStorage().getItem("token");
  },
};

export default authService;
