import axiosClient from "./axiosClient";

export type SmartClaimPayload = {
  insurer_id?: string;
  insurer_name?: string;
  scheme_name?: string;

  member_id: string;
  member_card_no?: string;
  member_name?: string;
  member_mobile?: string;
  member_email?: string;
  sms_opt_in?: boolean;

  kenya_provider_id: string;
  provider_name: string;
  provider_mobile?: string;
  county?: string;
  provider_type?: string;

  claim_type: "Inpatient" | "Outpatient";
  claim_start_date: string;
  claim_end_date: string;
  diagnosis: string;
  plan_type?: string;

  claim_amount: number;

  uploaded_documents?: string;
  missing_documents?: string;

  claim_form_no?: string;
  authorization_no?: string;
  invoice_no?: string;
  etims_receipt_no?: string;
  etims_invoice_reference?: string;
  etims_verified?: boolean;
};

export type SmartClaimResponse = {
  message: string;
  source: {
    client_name: string;
    client_type: string;
  };
  claim_id: string;
  recommendation: string;
  total_risk_score: number;
  primary_fawe_type: string;
  claim_status: string;
  risk_codes?: unknown[];
  email_alert?: unknown;
};

export async function sendSmartClaim(
  payload: SmartClaimPayload
): Promise<SmartClaimResponse> {
  const apiKey = import.meta.env.VITE_SMART_DEMO_API_KEY;

  if (!apiKey) {
    throw new Error("Missing VITE_SMART_DEMO_API_KEY in frontend .env");
  }

  const response = await axiosClient.post<SmartClaimResponse>(
    "/integrations/smart/claims",
    payload,
    {
      headers: {
        "x-api-key": apiKey,
      },
    }
  );

  return response.data;
}