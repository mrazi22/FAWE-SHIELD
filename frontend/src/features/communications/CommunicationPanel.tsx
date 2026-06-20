import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import {
  getClaimCommunicationStatus,
  sendClaimManagerAlert,
  sendHighRiskAlert,
  sendMissingDocumentsAlert,
  sendMemberConfirmation,
} from "../../api/communicationsApi";

import type {
  ClaimCommunicationLog,
  ClaimCommunicationStatusResponse,
} from "../../types/communications.types";

import PrimaryButton from "../../components/ui/PrimaryButton";
import SectionCard from "../../components/ui/SectionCard";

type CommunicationPanelProps = {
  claimId: string;
  recommendation?: string;
  claimStatus?: string;
  missingDocuments?: string;
};

export default function CommunicationPanel({
  claimId,
  recommendation,
  claimStatus,
  missingDocuments,
}: CommunicationPanelProps) {
  const [data, setData] = useState<ClaimCommunicationStatusResponse | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [sendingType, setSendingType] = useState<string | null>(null);

  async function loadCommunicationStatus() {
    try {
      setIsLoading(true);

      const result = await getClaimCommunicationStatus(claimId);

      setData(result);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Failed to load communication status.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadCommunicationStatus();
  }, [claimId]);

  async function handleSend(type: string) {
    try {
      setSendingType(type);

      if (type === "manager_alert") {
        await sendClaimManagerAlert(claimId);
        toast.success("Manager alert sent.");
      }

      if (type === "high_risk_alert") {
        await sendHighRiskAlert(claimId);
        toast.success("High-risk alert sent.");
      }

      if (type === "missing_documents_alert") {
        await sendMissingDocumentsAlert(claimId);
        toast.success("Missing documents alert sent.");
      }

      if (type === "member_confirmation") {
        await sendMemberConfirmation(claimId);
        toast.success("Member confirmation sent.");
      }

      await loadCommunicationStatus();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Failed to send email.");
    } finally {
      setSendingType(null);
    }
  }

  const logs = data?.logs || [];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-fawe-navy p-6 text-white shadow-soft">
        <p className="text-sm font-black uppercase tracking-[0.25em] text-fawe-greenSoft">
          Action / Communication Panel
        </p>

        <h2 className="mt-3 text-3xl font-black">
          Who needs to be notified?
        </h2>

        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
          FAWE Shield does not only detect risk. It helps teams act on it by
          sending alerts to managers, providers, members, and claims teams.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <CommunicationSummaryCard
          label="Total Emails"
          value={data?.summary.total || 0}
          tone="navy"
        />
        <CommunicationSummaryCard
          label="Sent"
          value={data?.summary.sent || 0}
          tone="green"
        />
        <CommunicationSummaryCard
          label="Failed"
          value={data?.summary.failed || 0}
          tone="red"
        />
        <CommunicationSummaryCard
          label="Member Confirmations"
          value={data?.summary.member_confirmations || 0}
          tone="blue"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <ActionCard
          title="Manager Alert"
          description="Notify claim managers that this claim needs attention."
          statusText={
            recommendation === "Review"
              ? "Recommended because this claim is marked for review."
              : "Useful when a claim needs manager visibility."
          }
          buttonText="Send Manager Alert"
          tone="amber"
          isLoading={sendingType === "manager_alert"}
          onClick={() => handleSend("manager_alert")}
        />

        <ActionCard
          title="Missing Documents Alert"
          description="Notify the provider or responsible team to submit missing documents."
          statusText={
            claimStatus === "Pending Documents" || missingDocuments
              ? `Missing: ${missingDocuments || "Required documents"}`
              : "Use when claim documents are incomplete."
          }
          buttonText="Send Missing Docs Alert"
          tone="blue"
          isLoading={sendingType === "missing_documents_alert"}
          onClick={() => handleSend("missing_documents_alert")}
        />

        <ActionCard
          title="Member Confirmation"
          description="Ask the member to confirm whether they actually visited the provider."
          statusText="Useful for suspected ghost visits or member verification."
          buttonText="Send Member Confirmation"
          tone="green"
          isLoading={sendingType === "member_confirmation"}
          onClick={() => handleSend("member_confirmation")}
        />
      </section>

      {recommendation === "Investigate" && (
        <SectionCard
          title="High Risk Alert"
          subtitle="This claim is marked for investigation. Send a high-priority fraud alert."
        >
          <PrimaryButton
            tone="red"
            disabled={sendingType === "high_risk_alert"}
            onClick={() => handleSend("high_risk_alert")}
          >
            {sendingType === "high_risk_alert"
              ? "Sending..."
              : "Send High Risk Alert"}
          </PrimaryButton>
        </SectionCard>
      )}

      <SectionCard
        title="Email Status"
        subtitle="Shows who was notified, whether the email was sent or failed, and the SMTP message ID."
      >
        {isLoading ? (
          <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">
            Loading communication history...
          </div>
        ) : logs.length === 0 ? (
          <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">
            No communication has been sent for this claim yet.
          </div>
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-2xl border border-slate-100 lg:block">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Recipient</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">SMTP Message ID</th>
                    <th className="px-4 py-3">Sent At</th>
                  </tr>
                </thead>

                <tbody>
                  {logs.map((log) => (
                    <CommunicationLogRow key={log.id} log={log} />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 lg:hidden">
              {logs.map((log) => (
                <CommunicationMobileCard key={log.id} log={log} />
              ))}
            </div>
          </>
        )}
      </SectionCard>
    </div>
  );
}

function ActionCard({
  title,
  description,
  statusText,
  buttonText,
  tone,
  isLoading,
  onClick,
}: {
  title: string;
  description: string;
  statusText: string;
  buttonText: string;
  tone: "green" | "amber" | "blue";
  isLoading: boolean;
  onClick: () => void;
}) {
  const toneClasses = {
    green: "bg-fawe-greenSoft text-fawe-greenDark",
    amber: "bg-fawe-amberSoft text-amber-700",
    blue: "bg-blue-100 text-blue-700",
  };

  const buttonTone = tone === "green" ? "green" : tone === "amber" ? "amber" : "navy";

  return (
    <div className="rounded-3xl bg-white p-5 shadow-soft">
      <div className={`mb-4 inline-flex rounded-2xl px-3 py-1 text-xs font-black ${toneClasses[tone]}`}>
        {title}
      </div>

      <p className="text-sm leading-6 text-slate-500">{description}</p>

      <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs font-semibold leading-5 text-slate-600">
        {statusText}
      </div>

      <PrimaryButton
        tone={buttonTone}
        className="mt-5 w-full"
        disabled={isLoading}
        onClick={onClick}
      >
        {isLoading ? "Sending..." : buttonText}
      </PrimaryButton>
    </div>
  );
}

function CommunicationSummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "navy" | "green" | "red" | "blue";
}) {
  const toneClasses = {
    navy: "bg-fawe-navy text-white",
    green: "bg-fawe-greenSoft text-fawe-greenDark",
    red: "bg-fawe-redSoft text-fawe-red",
    blue: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="rounded-3xl bg-white p-5 shadow-soft">
      <div className={`inline-flex rounded-2xl px-3 py-1 text-xs font-black ${toneClasses[tone]}`}>
        {label}
      </div>

      <p className="mt-4 text-3xl font-black text-fawe-navy">{value}</p>
    </div>
  );
}

function CommunicationLogRow({ log }: { log: ClaimCommunicationLog }) {
  return (
    <tr className="border-t border-slate-100">
      <td className="px-4 py-4">
        <p className="font-black text-fawe-navy">
          {formatMessageType(log.message_type)}
        </p>
        {log.subject && (
          <p className="mt-1 text-xs text-slate-400">{log.subject}</p>
        )}
      </td>

      <td className="px-4 py-4 text-sm font-semibold text-slate-700">
        {log.recipient_email}
      </td>

      <td className="px-4 py-4">
        <EmailStatusBadge status={log.status} />
      </td>

      <td className="max-w-xs truncate px-4 py-4 text-xs text-slate-500">
        {log.smtp_message_id || "-"}
      </td>

      <td className="px-4 py-4 text-sm text-slate-500">
        {formatDate(log.created_at)}
      </td>
    </tr>
  );
}

function CommunicationMobileCard({ log }: { log: ClaimCommunicationLog }) {
  return (
    <div className="rounded-2xl border border-slate-100 p-4">
      <div className="flex justify-between gap-3">
        <div>
          <p className="font-black text-fawe-navy">
            {formatMessageType(log.message_type)}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {log.recipient_email}
          </p>
        </div>

        <EmailStatusBadge status={log.status} />
      </div>

      <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs text-slate-500">
        <p>
          <span className="font-bold text-slate-700">SMTP:</span>{" "}
          {log.smtp_message_id || "-"}
        </p>
        <p className="mt-1">
          <span className="font-bold text-slate-700">Sent:</span>{" "}
          {formatDate(log.created_at)}
        </p>
      </div>
    </div>
  );
}

function EmailStatusBadge({ status }: { status: string }) {
  const isSent = status === "sent";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${
        isSent
          ? "bg-fawe-greenSoft text-fawe-greenDark"
          : "bg-fawe-redSoft text-fawe-red"
      }`}
    >
      {isSent ? "Sent" : "Failed"}
    </span>
  );
}

function formatMessageType(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value?: string) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}