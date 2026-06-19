import axiosClient from "./axiosClient";
import type {
  GetClaimsParams,
  GetClaimsResponse,
  GetClaimByIdResponse,
  CreateClaimPayload,
  CreateClaimResponse,
  UpdateClaimStatusPayload,
  UpdateClaimStatusResponse,
  ScoringResult,
} from "../types/claims.types";

export async function getClaims(
  params: GetClaimsParams = {}
): Promise<GetClaimsResponse> {
  const response = await axiosClient.get<GetClaimsResponse>("/claims", {
    params,
  });

  return response.data;
}

export async function getClaimById(
  claimId: string
): Promise<GetClaimByIdResponse> {
  const response = await axiosClient.get<GetClaimByIdResponse>(
    `/claims/${claimId}`
  );

  return response.data;
}

export async function createClaim(
  payload: CreateClaimPayload
): Promise<CreateClaimResponse> {
  const response = await axiosClient.post<CreateClaimResponse>(
    "/claims",
    payload
  );

  return response.data;
}

export async function updateClaimStatus(
  claimId: string,
  payload: UpdateClaimStatusPayload
): Promise<UpdateClaimStatusResponse> {
  const response = await axiosClient.patch<UpdateClaimStatusResponse>(
    `/claims/${claimId}/status`,
    payload
  );

  return response.data;
}

export async function scoreClaim(claimId: string): Promise<ScoringResult> {
  const response = await axiosClient.post<ScoringResult>(
    `/claims/${claimId}/score`
  );

  return response.data;
}