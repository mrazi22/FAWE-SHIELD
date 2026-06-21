import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import {
  sendSmartClaim,
  type SmartClaimPayload,
  type SmartClaimResponse,
} from "../../api/smartIntegrationApi";

import SectionCard from "../../components/ui/SectionCard";
import PrimaryButton from "../../components/ui/PrimaryButton";
import RiskBadge from "../../components/ui/RiskBadge";

type DemoScenario = "clean" | "missing_documents" | "high_risk" | "waste";

export default function SmartLctSimulatorPage() {
  const navigate = useNavigate();

  const [selectedScenario, setSelectedScenario] =
    useState<DemoScenario>("missing_documents");
  const [isSending, setIsSending] = useState(false);
  const [responses, setResponses] = useState<SmartClaimResponse[]>([]);

  const payload = useMemo(
    () => buildScenarioPayload(selectedScenario),
    [selectedScenario]
  );

  async function handleSendClaim() {
    try {
      setIsSending(true);

      toast.loading("Smart/LCT is sending claim to FAWE Shield...", {
        id: "smart-send",
      });

      const result = await sendSmartClaim(payload);

      setResponses((current) => [result, ...current]);

      toast.success("Claim received, scored, and processed.", {
        id: "smart-send",
      });
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Failed to simulate Smart/LCT claim.", {
        id: "smart-send",
      });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-fawe-navy p-6 text-white shadow-soft">
        <p className="text-sm font-black uppercase tracking-[0.25em] text-fawe-greenSoft">
          Smart/LCT Integration Simulator
        </p>

        <h1 className="mt-3 text-3xl font-black">
          Simulate claims coming from Smart/LCT
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
          This page demonstrates FAWE Shield acting as a real-time claims
          intelligence layer. A claim enters from Smart/LCT, FAWE scores it,
          returns a recommendation, and triggers alerts where needed.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
        <SectionCard
          title="Choose a Demo Scenario"
          subtitle="Select the type of claim Smart/LCT should send into FAWE Shield."
        >
          <div className="grid gap-3 md:grid-cols-2">
            <ScenarioButton
              title="Clean Claim"
              description="Low-risk claim with complete documents."
              active={selectedScenario === "clean"}
              onClick={() => setSelectedScenario("clean")}
              tone="green"
            />

            <ScenarioButton
              title="Missing Documents"
              description="Claim missing eTIMS or invoice documents."
              active={selectedScenario === "missing_documents"}
              onClick={() => setSelectedScenario("missing_documents")}
              tone="blue"
            />

            <ScenarioButton
              title="High-Risk Fraud"
              description="Large suspicious claim with reused invoice signals."
              active={selectedScenario === "high_risk"}
              onClick={() => setSelectedScenario("high_risk")}
              tone="red"
            />

            <ScenarioButton
              title="Waste Pattern"
              description="Claim above peer average with unnecessary cost."
              active={selectedScenario === "waste"}
              onClick={() => setSelectedScenario("waste")}
              tone="amber"
            />
          </div>

          <div className="mt-6">
            <PrimaryButton
              tone="green"
              disabled={isSending}
              onClick={handleSendClaim}
              className="w-full"
            >
              {isSending ? "Sending claim..." : "Send Claim from Smart/LCT"}
            </PrimaryButton>
          </div>
        </SectionCard>

        <SectionCard
          title="Payload Preview"
          subtitle="This is the claim data Smart/LCT will send to FAWE Shield."
        >
          <pre className="max-h-[520px] overflow-auto rounded-2xl bg-fawe-navy p-4 text-xs leading-6 text-green-100">
            {JSON.stringify(payload, null, 2)}
          </pre>
        </SectionCard>
      </section>

      <SectionCard
        title="Live FAWE Feedback"
        subtitle="Each response shows how FAWE Shield processed the claim."
      >
        {responses.length === 0 ? (
          <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-500">
            No Smart/LCT claim has been sent yet.
          </div>
        ) : (
          <div className="space-y-4">
            {responses.map((response) => (
              <div
                key={response.claim_id}
                className="rounded-3xl border border-slate-100 p-5"
              >
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                  <div>
                    <p className="text-sm font-black text-fawe-greenDark">
                      {response.source.client_name} •{" "}
                      {response.source.client_type}
                    </p>

                    <h3 className="mt-2 text-xl font-black text-fawe-navy">
                      {response.claim_id}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {response.message}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <RiskBadge
                      label={response.primary_fawe_type}
                      tone={
                        response.primary_fawe_type === "Fraud"
                          ? "red"
                          : response.primary_fawe_type === "Abuse"
                          ? "amber"
                          : response.primary_fawe_type === "Waste"
                          ? "green"
                          : "slate"
                      }
                    />

                    <RiskBadge
                      label={response.recommendation}
                      tone={
                        response.recommendation === "Investigate"
                          ? "red"
                          : response.recommendation === "Review"
                          ? "amber"
                          : "green"
                      }
                    />

                    <RiskBadge
                      label={`Risk ${response.total_risk_score}`}
                      tone={
                        response.total_risk_score >= 70
                          ? "red"
                          : response.total_risk_score >= 40
                          ? "amber"
                          : "green"
                      }
                    />
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-5">
                  <FlowStep number="1" title="Received" text="Claim entered from Smart/LCT." />
                  <FlowStep number="2" title="Inserted" text="Claim stored in FAWE Shield." />
                  <FlowStep number="3" title="Scored" text="FAWE rules analysed the claim." />
                  <FlowStep number="4" title="Recommended" text={response.recommendation} />
                  <FlowStep number="5" title="Alert" text={response.email_alert ? "Processed" : "None"} />
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <PrimaryButton
                    tone="navy"
                    onClick={() => navigate(`/claims/${response.claim_id}`)}
                  >
                    Open Claim Detail
                  </PrimaryButton>

                  <PrimaryButton
                    tone="green"
                    onClick={() => navigate("/claims/review")}
                  >
                    View Claims Queue
                  </PrimaryButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function ScenarioButton({
  title,
  description,
  active,
  onClick,
  tone,
}: {
  title: string;
  description: string;
  active: boolean;
  onClick: () => void;
  tone: "green" | "red" | "amber" | "blue";
}) {
  const activeClasses = {
    green: "border-fawe-green bg-fawe-greenSoft text-fawe-greenDark",
    red: "border-fawe-red bg-fawe-redSoft text-fawe-red",
    amber: "border-fawe-amber bg-fawe-amberSoft text-amber-700",
    blue: "border-blue-500 bg-blue-100 text-blue-700",
  };

  return (
    <button
      onClick={onClick}
      className={`rounded-3xl border p-5 text-left transition ${
        active
          ? activeClasses[tone]
          : "border-slate-100 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      <p className="font-black">{title}</p>
      <p className="mt-2 text-sm leading-6">{description}</p>
    </button>
  );
}

function FlowStep({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-fawe-green text-sm font-black text-white">
        {number}
      </div>
      <p className="mt-3 font-black text-fawe-navy">{title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{text}</p>
    </div>
  );
}

function buildScenarioPayload(scenario: DemoScenario): SmartClaimPayload {
  const randomId = Math.floor(Math.random() * 900000) + 100000;
  const today = new Date().toISOString().slice(0, 10);

  const basePayload: SmartClaimPayload = {
    insurer_id: "JUBILEE",
    insurer_name: "Jubilee Insurance",
    scheme_name: "Corporate Medical Cover",

    member_id: `MEM-DEMO-${randomId}`,
    member_card_no: `JUB-${randomId}`,
    member_name: "Demo Member",
    member_mobile: "254700000001",
    member_email: "member@example.com",
    sms_opt_in: true,

    kenya_provider_id: "KNH001",
    provider_name: "Kenyatta National Hospital",
    provider_mobile: "254711000001",
    county: "Nairobi",
    provider_type: "Public Hospital",

    claim_type: "Outpatient",
    claim_start_date: today,
    claim_end_date: today,
    diagnosis: "Malaria",
    plan_type: "Corporate",

    claim_amount: 12500,

    uploaded_documents: "claim_form,invoice,etims_receipt",
    missing_documents: "",

    claim_form_no: `CF-DEMO-${randomId}`,
    authorization_no: `AUTH-DEMO-${randomId}`,
    invoice_no: `INV-DEMO-${randomId}`,
    etims_receipt_no: `ETIMS-DEMO-${randomId}`,
    etims_invoice_reference: `INV-DEMO-${randomId}`,
    etims_verified: true,
  };

  if (scenario === "clean") {
    return {
      ...basePayload,
      claim_amount: 8500,
      diagnosis: "Upper respiratory tract infection",
      uploaded_documents: "claim_form,invoice,etims_receipt",
      missing_documents: "",
      etims_verified: true,
    };
  }

  if (scenario === "missing_documents") {
    return {
      ...basePayload,
      claim_amount: 18500,
      diagnosis: "Malaria",
      uploaded_documents: "claim_form,invoice",
      missing_documents: "etims_receipt",
      etims_receipt_no: "",
      etims_invoice_reference: "",
      etims_verified: false,
    };
  }

  if (scenario === "high_risk") {
    return {
      ...basePayload,
      member_id: `MEM-HIGH-${randomId}`,
      claim_amount: 285000,
      diagnosis: "Surgical procedure",
      claim_type: "Inpatient",
      provider_name: "High Risk Demo Hospital",
      kenya_provider_id: "DEMO-HIGH-001",
      uploaded_documents: "claim_form,invoice,etims_receipt,discharge_summary",
      missing_documents: "",
      invoice_no: "REUSED-INVOICE-001",
      etims_receipt_no: "ETIMS-MISMATCH-001",
      etims_invoice_reference: "DIFFERENT-INVOICE-REF",
      etims_verified: false,
    };
  }

  return {
    ...basePayload,
    claim_amount: 95000,
    diagnosis: "Routine laboratory tests",
    provider_name: "Costly Demo Medical Centre",
    kenya_provider_id: "DEMO-WASTE-001",
    uploaded_documents: "claim_form,invoice,etims_receipt",
    missing_documents: "",
    etims_verified: true,
  };
}