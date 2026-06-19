import { loginUser, logoutUser, logoutAllDevices, getMe } from "../api/authApi";
import { saveToken, removeToken } from "./token.service";
import type { LoginPayload, AuthUser } from "../types/auth.types";

export async function login(payload: LoginPayload): Promise<AuthUser> {
  const result = await loginUser(payload);

  saveToken(result.token);

  return result.user;
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  const result = await getMe();
  return result.user;
}

export async function logout(): Promise<void> {
  try {
    await logoutUser();
  } finally {
    removeToken();
  }
}

export async function logoutEverywhere(): Promise<void> {
  try {
    await logoutAllDevices();
  } finally {
    removeToken();
  }
}