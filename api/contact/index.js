"use strict";

const nodemailer = require("nodemailer");

function json(context, status, body) {
  context.res = {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body
  };
}

module.exports = async function (context, req) {
  if ((req.method || "").toUpperCase() !== "POST") {
    return json(context, 405, { error: "Method not allowed." });
  }

  try {
    const body = req.body || {};
    const { name, email, message } = body;

    if (!name || !email || !message) {
      return json(context, 400, { error: "Name, email, and message are required." });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return json(context, 400, { error: "Please provide a valid email address." });
    }

    context.log(`[contact] Submission — name=${name} email=${email}`);

    let emailSent = false;
    let emailError = null;

    try {
      await sendEmail(context, { name, email, message });
      emailSent = true;
      context.log("[contact] Email sent successfully");
    } catch (err) {
      emailError = err.message;
      context.log.error("[contact] Email failed:", err.message);
    }

    if (!emailSent) {
      return json(context, 502, { error: `Could not send your message (${emailError}). Please email us directly at hello@nusoftva.com.` });
    }
    return json(context, 200, { ok: true });
  } catch (err) {
    context.log.error("[contact] Handler error:", err);
    return json(context, 500, { error: "Could not send your message. Please email us directly at hello@nusoftva.com." });
  }
};

async function sendEmail(context, { name, email, message }) {
  const smtpConfig = {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  };

  context.log("[contact] SMTP host:", smtpConfig.host, "user:", smtpConfig.auth.user);

  if (!smtpConfig.auth.user || !smtpConfig.auth.pass) {
    throw new Error("SMTP credentials not configured.");
  }

  const transporter = nodemailer.createTransport(smtpConfig);
  await transporter.verify();
  context.log("[contact] SMTP connection verified");

  const recipient = process.env.RECIPIENT_EMAIL || "hello@nusoftva.com";
  const received = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });

  const mailOptions = {
    from: `"${process.env.SMTP_FROM || "Tree Studio Contact"}" <${smtpConfig.auth.user}>`,
    to: recipient,
    replyTo: `"${name}" <${email}>`,
    subject: `Tree Studio — message from ${name}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;color:#13273a;">
        <h2 style="margin-bottom:4px;">New message from Tree Studio Help</h2>
        <p style="color:#4a6170;font-size:13px;">Received: ${received}</p>
        <hr style="border:none;border-top:1px solid #d2dde8;margin:16px 0;" />
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
        <p><strong>Message:</strong></p>
        <div style="background:#f7fbfd;border:1px solid #d2dde8;border-radius:8px;padding:16px;white-space:pre-wrap;">${message}</div>
        <hr style="border:none;border-top:1px solid #d2dde8;margin:16px 0;" />
        <p style="font-size:12px;color:#4a6170;">Sent via treestudio.nusoftva.com contact form</p>
      </div>`,
    text: `New message from Tree Studio Help\n\nName: ${name}\nEmail: ${email}\nReceived: ${received}\n\nMessage:\n${message}`
  };

  const maxRetries = 3;
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      context.log(`[contact] Send attempt ${attempt}/${maxRetries}`);
      const result = await transporter.sendMail(mailOptions);
      context.log("[contact] Sent, messageId:", result.messageId);
      return result;
    } catch (err) {
      lastError = err;
      context.log.warn(`[contact] Attempt ${attempt} failed:`, err.message);
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
      }
    }
  }
  throw new Error(`Failed after ${maxRetries} attempts: ${lastError.message}`);
}
