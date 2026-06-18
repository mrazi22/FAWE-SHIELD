const transporter = require("../config/mailer");
const pool = require("../config/db");

function getFromAddress() {
  return process.env.EMAIL_FROM || process.env.EMAIL_USER;
}

async function logEmailAttempt({
  claimId = null,
  recipientEmail,
  recipientName = null,
  recipientRole = null,
  subject,
  messageType,
  status,
  providerResponse = null,
  errorMessage = null,
  sentByUserId = null,
}) {
  await pool.query(
    `
    INSERT INTO email_logs (
      claim_id,
      recipient_email,
      recipient_name,
      recipient_role,
      subject,
      message_type,
      status,
      provider_response,
      error_message,
      sent_by_user_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      claimId,
      recipientEmail,
      recipientName,
      recipientRole,
      subject,
      messageType,
      status,
      providerResponse ? JSON.stringify(providerResponse) : null,
      errorMessage,
      sentByUserId,
    ]
  );
}

async function sendEmail({
  to,
  cc,
  bcc,
  subject,
  html,
  text,
  claimId = null,
  messageType = "general",
  recipientName = null,
  recipientRole = null,
  sentByUserId = null,
}) {
  const recipients = Array.isArray(to) ? to : [to];

  if (!recipients.length || !recipients[0]) {
    throw new Error("Email recipient is required.");
  }

  if (!subject) {
    throw new Error("Email subject is required.");
  }

  const mailOptions = {
    from: getFromAddress(),
    to: recipients.join(","),
    cc,
    bcc,
    subject,
    html,
    text,
  };

  try {
    const info = await transporter.sendMail(mailOptions);

    for (const recipient of recipients) {
      await logEmailAttempt({
        claimId,
        recipientEmail: recipient,
        recipientName,
        recipientRole,
        subject,
        messageType,
        status: "Sent",
        providerResponse: {
          messageId: info.messageId,
          accepted: info.accepted,
          rejected: info.rejected,
          response: info.response,
        },
        sentByUserId,
      });
    }

    return info;
  } catch (error) {
    for (const recipient of recipients) {
      await logEmailAttempt({
        claimId,
        recipientEmail: recipient,
        recipientName,
        recipientRole,
        subject,
        messageType,
        status: "Failed",
        errorMessage: error.message,
        sentByUserId,
      });
    }

    throw error;
  }
}

async function verifyEmailConnection() {
  return transporter.verify();
}

module.exports = {
  sendEmail,
  verifyEmailConnection,
  logEmailAttempt,
};
