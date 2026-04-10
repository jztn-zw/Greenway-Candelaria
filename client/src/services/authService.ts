// src/services/authService.ts
import api from "@/lib/api";

export interface RegisterData {
  full_name: string;
  username: string;
  email: string;
  password: string;
  phone?: string;
  barangay_id?: string;
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

    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));

    return { token, user };
  },

  logout: async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  },

  getMe: async (): Promise<User> => {
    const response = await api.get("/auth/me");
    return response.data.data;
  },

  // ✅ Fixed: wrapped in try/catch — guards against corrupted or tampered localStorage
  getCurrentUser: (): User | null => {
    try {
      const user = localStorage.getItem("user");
      return user ? (JSON.parse(user) as User) : null;
    } catch {
      // If JSON.parse fails (corrupted data), clear and return null
      localStorage.removeItem("user");
      return null;
    }
  },

  getToken: (): string | null => {
    return localStorage.getItem("token");
  },

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem("token");
  },
};

export default authService;
