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

    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASSWORD;
    const recipient = process.env.RECIPIENT_EMAIL || "hello@nusoftva.com";

    if (!smtpUser || !smtpPass) {
      // Log submission even if email is misconfigured
      context.log(`[contact] Name=${name} Email=${email} Message=${message}`);
      return json(context, 200, { ok: true });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: false,
      auth: { user: smtpUser, pass: smtpPass }
    });

    await transporter.sendMail({
      from: `"Tree Studio Contact" <${smtpUser}>`,
      to: recipient,
      replyTo: `"${name}" <${email}>`,
      subject: `Tree Studio — message from ${name}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;color:#13273a;">
          <h2 style="margin-bottom:4px;">New message from Tree Studio Help</h2>
          <p style="color:#4a6170;font-size:13px;">Received: ${new Date().toLocaleString("en-US",{timeZone:"America/New_York"})}</p>
          <hr style="border:none;border-top:1px solid #d2dde8;margin:16px 0;" />
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
          <p><strong>Message:</strong></p>
          <div style="background:#f7fbfd;border:1px solid #d2dde8;border-radius:8px;padding:16px;white-space:pre-wrap;">${message}</div>
          <hr style="border:none;border-top:1px solid #d2dde8;margin:16px 0;" />
          <p style="font-size:12px;color:#4a6170;">Sent via treestudio.nusoftva.com contact form</p>
        </div>`,
      text: `New message from Tree Studio Help\n\nName: ${name}\nEmail: ${email}\n\nMessage:\n${message}`
    });

    context.log(`[contact] Email sent — from ${email}`);
    return json(context, 200, { ok: true });
  } catch (err) {
    context.log.error("[contact] Error:", err);
    return json(context, 500, { error: "Could not send your message. Please email us directly at hello@nusoftva.com." });
  }
};
