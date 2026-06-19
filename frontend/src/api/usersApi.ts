import axiosClient from "./axiosClient";
import type {
  CreateUserPayload,
  CreateUserResponse,
  GetUsersResponse,
} from "../types/users.types";

export async function createUser(
  payload: CreateUserPayload
): Promise<CreateUserResponse> {
  const response = await axiosClient.post<CreateUserResponse>("/users", payload);
  return response.data;
}

export async function getUsers(): Promise<GetUsersResponse> {
  const response = await axiosClient.get<GetUsersResponse>("/users");
  return response.data;
}