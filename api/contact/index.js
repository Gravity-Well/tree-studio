"use strict";

const { ClientSecretCredential } = require('@azure/identity');
const { Client } = require('@microsoft/microsoft-graph-client');
const { TokenCredentialAuthenticationProvider } = require('@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials');

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
      context.log("[contact] Email sent successfully via Microsoft Graph");
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
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;
  const senderEmail = process.env.MAIL_SENDER || 'admin@nusoft2472aolcom.onmicrosoft.com';
  const recipientEmail = process.env.RECIPIENT_EMAIL || 'hello@nusoftva.com';

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error('Microsoft Graph credentials not configured. Set AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET.');
  }

  context.log(`[contact] Graph sender=${senderEmail} recipient=${recipientEmail}`);

  const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
  const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: ['https://graph.microsoft.com/.default']
  });
  const graphClient = Client.initWithMiddleware({ authProvider });

  const received = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });

  const mailMessage = {
    message: {
      subject: `Tree Studio — message from ${name}`,
      body: {
        contentType: 'HTML',
        content: `
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
</div>`
      },
      toRecipients: [
        { emailAddress: { address: recipientEmail } }
      ],
      replyTo: [
        { emailAddress: { address: email, name } }
      ]
    },
    saveToSentItems: false
  };

  await graphClient.api(`/users/${senderEmail}/sendMail`).post(mailMessage);
  context.log(`[contact] Sent via Graph to ${recipientEmail}`);
}
