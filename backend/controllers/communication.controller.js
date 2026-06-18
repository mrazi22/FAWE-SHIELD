const {
  sendEmail,
  verifyEmailConnection,
} = require("../services/email.service");

const {
  sendClaimManagerAlert,
  sendHighRiskAlert,
  sendMissingDocumentsAlert,
  sendMemberClaimConfirmation,
  confirmMemberClaimVisit,
} = require("../services/claimEmail.service");

const {
  sendLossRatioReport,
} = require("../services/reportEmail.service");

function getUserId(req) {
  return req.user?.id || req.user?.userId || null;
}

async function testEmail(req, res) {
  try {
    const { to, subject, message } = req.body;

    if (!to) {
      return res.status(400).json({
        message: "Recipient email is required.",
      });
    }

    const info = await sendEmail({
      to,
      subject: subject || "FAWE Shield Test Email",
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>FAWE Shield Test Email</h2>
          <p>${message || "Your email service is working."}</p>
        </div>
      `,
      text: message || "Your email service is working.",
      messageType: "test_email",
      sentByUserId: getUserId(req),
    });

    return res.json({
      message: "Test email sent successfully.",
      message_id: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
    });
  } catch (error) {
    console.error("testEmail error:", error);

    return res.status(500).json({
      message: "Failed to send test email.",
      error: error.message,
    });
  }
}

async function verifyEmail(req, res) {
  try {
    await verifyEmailConnection();

    return res.json({
      message: "Email connection verified successfully.",
    });
  } catch (error) {
    console.error("verifyEmail error:", error);

    return res.status(500).json({
      message: "Email connection failed.",
      error: error.message,
    });
  }
}

async function sendManagerAlert(req, res) {
  try {
    const result = await sendClaimManagerAlert(req.params.claimId, {
      sentByUserId: getUserId(req),
    });

    return res.json({
      message: "Claim manager alert processed.",
      result,
    });
  } catch (error) {
    console.error("sendManagerAlert error:", error);

    return res.status(error.statusCode || 500).json({
      message: error.message || "Failed to send manager alert.",
      code: error.code,
      sqlMessage: error.sqlMessage,
    });
  }
}

async function sendHighRisk(req, res) {
  try {
    const result = await sendHighRiskAlert(req.params.claimId, {
      sentByUserId: getUserId(req),
    });

    return res.json({
      message: "High-risk alert processed.",
      result,
    });
  } catch (error) {
    console.error("sendHighRisk error:", error);

    return res.status(error.statusCode || 500).json({
      message: error.message || "Failed to send high-risk alert.",
      code: error.code,
      sqlMessage: error.sqlMessage,
    });
  }
}

async function sendMissingDocuments(req, res) {
  try {
    const result = await sendMissingDocumentsAlert(req.params.claimId, {
      sentByUserId: getUserId(req),
    });

    return res.json({
      message: "Missing-document email alert processed.",
      result,
    });
  } catch (error) {
    console.error("sendMissingDocuments error:", error);

    return res.status(error.statusCode || 500).json({
      message: error.message || "Failed to send missing-document alert.",
      code: error.code,
      sqlMessage: error.sqlMessage,
    });
  }
}

async function sendMemberConfirmation(req, res) {
  try {
    const result = await sendMemberClaimConfirmation(req.params.claimId, {
      sentByUserId: getUserId(req),
    });

    return res.json({
      message: "Member confirmation email processed.",
      result,
    });
  } catch (error) {
    console.error("sendMemberConfirmation error:", error);

    return res.status(error.statusCode || 500).json({
      message: error.message || "Failed to send member confirmation email.",
      code: error.code,
      sqlMessage: error.sqlMessage,
    });
  }
}

async function confirmClaimVisit(req, res) {
  try {
    const { token, response } = req.query;

    if (!token || !response) {
      return res.status(400).send("Missing token or response.");
    }

    const result = await confirmMemberClaimVisit({
      token,
      response,
    });

    const safeResponse = result.response || "already recorded";

    return res.send(`
      <html>
        <body style="font-family: Arial, sans-serif;">
          <h2>Thank you</h2>
          <p>Your claim visit confirmation has been ${safeResponse}.</p>
          <p>Claim ID: ${result.claim_id}</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("confirmClaimVisit error:", error);

    return res.status(error.statusCode || 500).send(`
      <html>
        <body style="font-family: Arial, sans-serif;">
          <h2>Confirmation Failed</h2>
          <p>${error.message || "Unable to confirm claim visit."}</p>
        </body>
      </html>
    `);
  }
}

async function sendLossRatio(req, res) {
  try {
    const insurerId =
      req.body.insurer_id ||
      req.body.insurerId ||
      req.user?.insurerId ||
      req.user?.insurer_id;

    const result = await sendLossRatioReport({
      insurerId,
      toEmails: req.body.to_emails || [],
      sentByUserId: getUserId(req),
    });

    return res.json({
      message: "Loss ratio report email processed.",
      result,
    });
  } catch (error) {
    console.error("sendLossRatio error:", error);

    return res.status(error.statusCode || 500).json({
      message: error.message || "Failed to send loss ratio report.",
      code: error.code,
      sqlMessage: error.sqlMessage,
    });
  }
}

module.exports = {
  testEmail,
  verifyEmail,
  sendManagerAlert,
  sendHighRisk,
  sendMissingDocuments,
  sendMemberConfirmation,
  confirmClaimVisit,
  sendLossRatio,
};
