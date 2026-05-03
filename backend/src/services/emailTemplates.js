/**
 * Transactional HTML emails — table layout for broad client compatibility (Mailtrap, Gmail, etc.).
 */

const BRAND = "MediBook";
const PRIMARY = "#1d4ed8";
const PRIMARY_DARK = "#1e3a8a";
const MUTED = "#64748b";
const BORDER = "#e2e8f0";
const BG = "#f1f5f9";

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Safe for double-quoted HTML attributes (e.g. href). */
function escapeAttr(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Outer shell: preheader (hidden preview), logo bar, content card, footer.
 */
function layout({ title, preheader, innerHtml }) {
  const safeTitle = escapeHtml(title);
  const safePre = escapeHtml(preheader);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>
</head>
<body style="margin:0;padding:0;background-color:${BG};font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;">${safePre}</span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:${BG};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;" cellspacing="0" cellpadding="0">
          <tr>
            <td style="padding:0 0 16px 0;text-align:left;">
              <span style="font-size:20px;font-weight:700;color:${PRIMARY};letter-spacing:-0.02em;">${escapeHtml(BRAND)}</span>
              <span style="font-size:13px;color:${MUTED};display:block;margin-top:4px;">Healthcare scheduling</span>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;border-radius:12px;border:1px solid ${BORDER};overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.06);">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding:28px 28px 8px 28px;">
                    <h1 style="margin:0;font-size:20px;line-height:1.35;color:#0f172a;font-weight:600;">${safeTitle}</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 28px 28px 28px;font-size:15px;line-height:1.6;color:#334155;">
                    ${innerHtml}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 8px 0 8px;text-align:center;font-size:12px;line-height:1.5;color:${MUTED};">
              This message was sent by ${escapeHtml(BRAND)}. If you did not request it, you can ignore this email.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function ctaButton(href, label) {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:20px 0;">
    <tr>
      <td align="left">
        <a href="${escapeAttr(href)}" style="display:inline-block;padding:12px 24px;background:${PRIMARY};color:#ffffff!important;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`;
}

function fallbackLink(url) {
  return `<p style="margin:16px 0 0 0;font-size:13px;color:${MUTED};">If the button does not work, copy and paste this link into your browser:</p>
  <p style="margin:8px 0 0 0;font-size:12px;word-break:break-all;color:${PRIMARY_DARK};">${escapeHtml(url)}</p>`;
}

function verificationEmail({ name, verifyUrl }) {
  const inner = `
    <p style="margin:0 0 16px 0;">Hi ${escapeHtml(name)},</p>
    <p style="margin:0 0 16px 0;">Thanks for signing up. Please confirm your email address so our team can review your account.</p>
    ${ctaButton(verifyUrl, "Verify email address")}
    ${fallbackLink(verifyUrl)}
    <p style="margin:24px 0 0 0;font-size:13px;color:${MUTED};">This link expires in 48 hours. After verification, an administrator will approve your access to ${escapeHtml(BRAND)}.</p>
  `;
  const text = `Hi ${name},\n\nVerify your ${BRAND} email (expires in 48 hours):\n${verifyUrl}\n\nAfter verification, an administrator must approve your account.\n`;
  const html = layout({
    title: "Confirm your email",
    preheader: `Verify your ${BRAND} account to continue registration.`,
    innerHtml: inner,
  });
  return { subject: `Verify your ${BRAND} email`, text, html };
}

function registrationApprovedEmail({ name, signInUrl }) {
  const inner = `
    <p style="margin:0 0 16px 0;">Hi ${escapeHtml(name)},</p>
    <p style="margin:0 0 16px 0;">Good news — an administrator has <strong>approved</strong> your ${escapeHtml(BRAND)} account. You can sign in whenever you are ready.</p>
    ${ctaButton(signInUrl, "Sign in to MediBook")}
    ${fallbackLink(signInUrl)}
    <p style="margin:24px 0 0 0;font-size:13px;color:${MUTED};">If you have questions, contact your clinic administrator.</p>
  `;
  const text = `Hi ${name},\n\nYour ${BRAND} account was approved. Sign in: ${signInUrl}\n`;
  const html = layout({
    title: "Your account was approved",
    preheader: "You can now sign in to MediBook.",
    innerHtml: inner,
  });
  return { subject: `Your ${BRAND} account was approved`, text, html };
}

function registrationRejectedEmail({ name, reason }) {
  const reasonBlock =
    reason && String(reason).trim()
      ? `<div style="margin:16px 0;padding:14px 16px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;font-size:14px;color:#991b1b;">
           <strong>Reason provided:</strong><br/>${escapeHtml(String(reason).trim())}
         </div>`
      : `<p style="margin:16px 0;font-size:14px;color:${MUTED};">No additional details were provided.</p>`;
  const inner = `
    <p style="margin:0 0 16px 0;">Hi ${escapeHtml(name)},</p>
    <p style="margin:0 0 16px 0;">We are writing to let you know that your ${escapeHtml(BRAND)} registration request was <strong>not approved</strong> at this time.</p>
    ${reasonBlock}
    <p style="margin:16px 0 0 0;font-size:14px;color:${MUTED};">If you believe this was a mistake, please contact your clinic or administrator.</p>
  `;
  const text = `Hi ${name},\n\nYour ${BRAND} registration was not approved.${reason && String(reason).trim() ? `\n\nReason: ${String(reason).trim()}` : ""}\n\nContact your clinic if you have questions.\n`;
  const html = layout({
    title: "Registration update",
    preheader: "Your MediBook registration was not approved.",
    innerHtml: inner,
  });
  return { subject: `Your ${BRAND} registration was not approved`, text, html };
}

function welcomeEmail({ name, signInUrl, tempPassword }) {
  const pwd = tempPassword
    ? `<div style="margin:16px 0;padding:14px 16px;background:#f8fafc;border:1px solid ${BORDER};border-radius:8px;font-size:14px;">
         <strong>Temporary password:</strong> <code style="font-size:13px;">${escapeHtml(tempPassword)}</code>
         <p style="margin:8px 0 0 0;font-size:13px;color:${MUTED};">Sign in and change your password as soon as possible.</p>
       </div>`
    : "";
  const inner = `
    <p style="margin:0 0 16px 0;">Hi ${escapeHtml(name)},</p>
    <p style="margin:0 0 16px 0;">Your ${escapeHtml(BRAND)} account is ready.</p>
    ${pwd}
    ${ctaButton(signInUrl, "Open MediBook")}
    ${fallbackLink(signInUrl)}
  `;
  const text = `Hi ${name},\n\nYour ${BRAND} account is ready.${tempPassword ? `\n\nTemporary password: ${tempPassword}` : ""}\n\nSign in: ${signInUrl}\n`;
  const html = layout({
    title: "Welcome to MediBook",
    preheader: "Your account is ready.",
    innerHtml: inner,
  });
  return { subject: `Welcome to ${BRAND}`, text, html };
}

function passwordResetEmail({ name, resetLink }) {
  const inner = `
    <p style="margin:0 0 16px 0;">Hi ${escapeHtml(name)},</p>
    <p style="margin:0 0 16px 0;">We received a request to reset your ${escapeHtml(BRAND)} password. Use the button below — it expires in one hour.</p>
    ${ctaButton(resetLink, "Reset password")}
    ${fallbackLink(resetLink)}
    <p style="margin:24px 0 0 0;font-size:13px;color:${MUTED};">If you did not request a reset, you can ignore this email.</p>
  `;
  const text = `Hi ${name},\n\nReset your ${BRAND} password (expires in 1 hour):\n${resetLink}\n`;
  const html = layout({
    title: "Reset your password",
    preheader: "Reset your MediBook password.",
    innerHtml: inner,
  });
  return { subject: `Reset your ${BRAND} password`, text, html };
}

module.exports = {
  verificationEmail,
  registrationApprovedEmail,
  registrationRejectedEmail,
  passwordResetEmail,
  welcomeEmail,
};
