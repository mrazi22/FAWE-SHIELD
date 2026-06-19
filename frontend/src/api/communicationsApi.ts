import axiosClient from "./axiosClient";
import type {
  TestEmailPayload,
  TestEmailResponse,
  VerifyEmailResponse,
  EmailAlertResponse,
  SendLossRatioPayload,
  SendLossRatioResponse,
} from "../types/communications.types";

export async function testEmail(
  payload: TestEmailPayload
): Promise<TestEmailResponse> {
  const response = await axiosClient.post<TestEmailResponse>(
    "/communications/email/test",
    payload
  );

  return response.data;
}

export async function verifyEmail(): Promise<VerifyEmailResponse> {
  const response = await axiosClient.get<VerifyEmailResponse>(
    "/communications/email/verify"
  );

  return response.data;
}

export async function sendClaimManagerAlert(
  claimId: string
): Promise<EmailAlertResponse> {
  const response = await axiosClient.post<EmailAlertResponse>(
    `/communications/claims/${claimId}/manager-alert`
  );

  return response.data;
}

export async function sendHighRiskAlert(
  claimId: string
): Promise<EmailAlertResponse> {
  const response = await axiosClient.post<EmailAlertResponse>(
    `/communications/claims/${claimId}/high-risk-alert`
  );

  return response.data;
}

export async function sendMissingDocumentsAlert(
  claimId: string
): Promise<EmailAlertResponse> {
  const response = await axiosClient.post<EmailAlertResponse>(
    `/communications/claims/${claimId}/missing-documents-alert`
  );

  return response.data;
}

export async function sendMemberConfirmation(
  claimId: string
): Promise<EmailAlertResponse> {
  const response = await axiosClient.post<EmailAlertResponse>(
    `/communications/claims/${claimId}/member-confirmation`
  );

  return response.data;
}

export async function sendLossRatioReport(
  payload: SendLossRatioPayload
): Promise<SendLossRatioResponse> {
  const response = await axiosClient.post<SendLossRatioResponse>(
    "/communications/reports/loss-ratio",
    payload
  );

  return response.data;
}