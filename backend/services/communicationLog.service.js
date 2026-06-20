const pool = require("../config/db");

async function logClaimEmail({
  claimId,
  messageType,
  recipientEmail,
  subject = null,
  status = "sent",
  smtpMessageId = null,
  errorMessage = null,
  sentByUserId = null,
}) {
  await pool.query(
    `
    INSERT INTO claim_communication_logs (
      claim_id,
      message_type,
      recipient_email,
      subject,
      status,
      smtp_message_id,
      error_message,
      sent_by_user_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      claimId,
      messageType,
      recipientEmail,
      subject,
      status,
      smtpMessageId,
      errorMessage,
      sentByUserId,
    ]
  );
}

async function logEmailResult({
  claimId,
  messageType,
  subject = null,
  result,
  sentByUserId = null,
}) {
  const info = result?.info || result || {};

  const accepted = Array.isArray(info.accepted) ? info.accepted : [];
  const rejected = Array.isArray(info.rejected) ? info.rejected : [];

  const smtpMessageId = info.messageId || info.message_id || null;

  for (const email of accepted) {
    await logClaimEmail({
      claimId,
      messageType,
      recipientEmail: email,
      subject,
      status: "sent",
      smtpMessageId,
      sentByUserId,
    });
  }

  for (const email of rejected) {
    await logClaimEmail({
      claimId,
      messageType,
      recipientEmail: email,
      subject,
      status: "failed",
      smtpMessageId,
      errorMessage: "Recipient rejected by SMTP server.",
      sentByUserId,
    });
  }

  /*
    If the email service returns no accepted/rejected array,
    but returns recipients or toEmails, we still try to log something useful.
  */
  if (accepted.length === 0 && rejected.length === 0) {
    const fallbackRecipients =
      result?.recipients ||
      result?.toEmails ||
      result?.to_emails ||
      result?.to ||
      [];

    const normalizedRecipients = Array.isArray(fallbackRecipients)
      ? fallbackRecipients
      : [fallbackRecipients].filter(Boolean);

    for (const email of normalizedRecipients) {
      await logClaimEmail({
        claimId,
        messageType,
        recipientEmail: email,
        subject,
        status: "sent",
        smtpMessageId,
        sentByUserId,
      });
    }
  }
}

async function getClaimCommunicationLogs(claimId) {
  const [rows] = await pool.query(
    `
    SELECT
      id,
      claim_id,
      message_type,
      recipient_email,
      subject,
      status,
      smtp_message_id,
      error_message,
      sent_by_user_id,
      created_at
    FROM claim_communication_logs
    WHERE claim_id = ?
    ORDER BY created_at DESC, id DESC
    `,
    [claimId]
  );

  return rows;
}

module.exports = {
  logClaimEmail,
  logEmailResult,
  getClaimCommunicationLogs,
};