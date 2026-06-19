import type { UserRole } from "./auth.types";

export type AppUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  insurerId?: string | null;
  providerId?: string | null;
  memberId?: string | null;
  isActive?: boolean;
  createdAt?: string;
};

export type CreateUserPayload = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  insurer_id?: string | null;
  provider_id?: string | null;
  member_id?: string | null;
};

export type CreateUserResponse = {
  message: string;
  user: AppUser;
};

export type GetUsersResponse = {
  count: number;
  data: AppUser[];
};