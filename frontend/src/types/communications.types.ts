export type TestEmailPayload = {
  to: string;
  subject?: string;
  message?: string;
};

export type EmailStatus = "sent" | "failed";

export type ClaimCommunicationLog = {
  id: number;
  claim_id: string;
  message_type: string;
  recipient_email: string;
  subject?: string | null;
  status: EmailStatus;
  smtp_message_id?: string | null;
  error_message?: string | null;
  sent_by_user_id?: number | null;
  created_at: string;
};

export type ClaimCommunicationSummary = {
  total: number;
  sent: number;
  failed: number;
  manager_alerts: number;
  missing_documents_alerts: number;
  member_confirmations: number;
};

export type ClaimCommunicationStatusResponse = {
  claim_id: string;
  summary: ClaimCommunicationSummary;
  logs: ClaimCommunicationLog[];
};

export type TestEmailResponse = {
  message: string;
  message_id?: string;
  accepted?: string[];
  rejected?: string[];
};

export type VerifyEmailResponse = {
  message: string;
};

export type EmailAlertResponse = {
  message: string;
  result: unknown;
};

export type SendLossRatioPayload = {
  insurer_id?: string;
  insurerId?: string;
  to_emails?: string[];
};

export type SendLossRatioResponse = {
  message: string;
  result: unknown;
};