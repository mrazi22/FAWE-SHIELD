import axiosClient from "./axiosClient";
import type {
  LoginPayload,
  LoginResponse,
  MeResponse,
  LogoutResponse,
} from "../types/auth.types";

export async function loginUser(payload: LoginPayload): Promise<LoginResponse> {
  const response = await axiosClient.post<LoginResponse>("/auth/login", payload);
  return response.data;
}

export async function getMe(): Promise<MeResponse> {
  const response = await axiosClient.get<MeResponse>("/auth/me");
  return response.data;
}

export async function logoutUser(): Promise<LogoutResponse> {
  const response = await axiosClient.post<LogoutResponse>("/auth/logout");
  return response.data;
}

export async function logoutAllDevices(): Promise<LogoutResponse> {
  const response = await axiosClient.post<LogoutResponse>("/auth/logout-all");
  return response.data;
}