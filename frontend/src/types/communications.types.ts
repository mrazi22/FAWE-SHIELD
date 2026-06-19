export type TestEmailPayload = {
  to: string;
  subject?: string;
  message?: string;
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