export type UserRole =
  | "system_admin"
  | "insurer_admin"
  | "claims_officer"
  | "fraud_investigator"
  | "provider_user"
  | "member";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  insurerId?: string | null;
  providerId?: string | null;
  memberId?: string | null;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type LoginResponse = {
  message: string;
  token: string;
  user: AuthUser;
};

export type MeResponse = {
  user: AuthUser;
};

export type LogoutResponse = {
  message: string;
};