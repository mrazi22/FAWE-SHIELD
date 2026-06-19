require("dotenv").config();

const nodemailer = require("nodemailer");

function buildTransporter() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("EMAIL_USER and EMAIL_PASS are required.");
  }

  if (process.env.EMAIL_HOST) {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT || 587),
      secure: String(process.env.EMAIL_SECURE || "false") === "true",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

const transporter = buildTransporter();

module.exports = transporter;
