// src/services/authService.ts
import api from "@/lib/api";
import { getAuthStorage } from "@/lib/authStorage";

export interface RegisterData {
  email: string;
  password: string;
  confirm_password: string;
  terms_accepted: boolean;
}
export interface ResidentSetupData {
  full_name: string;
  username: string;
  phone: string;
  barangay_id: string;
  street_id?: string | null;
}

export interface LoginData {
  identifier: string;
  password: string;
}

export interface User {
  id: string;
  full_name: string;
  username: string;
  email: string | null;
  role: string;
  status: string;
  avatar_url: string | null;
  barangay_id: string | null;
  barangay_name?: string | null;
  street_id?: string | null;
  street_name?: string | null;
  street_area?: string | null;
  phone?: string | null;
  profile_completed?: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

const authService = {
  completeResidentProfile: async (data: ResidentSetupData): Promise<User> => {
    const response = await api.put("/auth/resident-profile", data);
    return response.data.data;
  },
  recoverPassword: async (data: { identifier: string; recovery_code: string; new_password: string; confirm_password: string }): Promise<{ recovery_code: string }> => {
    const response = await api.post("/auth/recover", data);
    return response.data.data;
  },
  replaceRecoveryCode: async (password: string): Promise<{ recovery_code: string }> => {
    const response = await api.post("/auth/recovery-code", { password });
    return response.data.data;
  },
  register: async (data: RegisterData) => {
    const response = await api.post("/auth/register", data);
    return response.data as { data: { email: string; recovery_code: string } };
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
