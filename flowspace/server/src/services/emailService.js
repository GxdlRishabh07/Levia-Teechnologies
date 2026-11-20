import { env } from '../config/env.js';

/**
 * Builds HTML template for password reset email with FlowSpace styling.
 *
 * @param {{ userName: string, resetUrl: string }} params
 */
function buildResetEmailHtml({ userName, resetUrl }) {
  const safeName = userName ? String(userName).trim() : 'there';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your FlowSpace password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0d1117; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e6edf3;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0d1117; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #161b22; border: 1px solid #30363d; border-radius: 12px; padding: 36px 32px; box-shadow: 0 8px 24px rgba(0,0,0,0.4);">
          <!-- Logo / Header -->
          <tr>
            <td style="padding-bottom: 24px; text-align: left;">
              <span style="font-size: 22px; font-weight: 700; color: #58a6ff; letter-spacing: -0.5px;">⚡ FlowSpace</span>
            </td>
          </tr>

          <!-- Heading -->
          <tr>
            <td style="padding-bottom: 16px; font-size: 20px; font-weight: 600; color: #ffffff;">
              Reset your password
            </td>
          </tr>

          <!-- Message -->
          <tr>
            <td style="padding-bottom: 24px; font-size: 15px; line-height: 1.6; color: #8b949e;">
              Hi <strong style="color: #e6edf3;">${safeName}</strong>,<br><br>
              We received a request to reset your password for your FlowSpace account. Click the button below to choose a new password. This link will expire in <strong>1 hour</strong>.
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding-bottom: 28px;">
              <a href="${resetUrl}" target="_blank" style="display: inline-block; background-color: #238636; color: #ffffff; padding: 12px 28px; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                Reset Password
              </a>
            </td>
          </tr>

          <!-- Direct Link -->
          <tr>
            <td style="padding-bottom: 24px; font-size: 13px; line-height: 1.5; color: #8b949e; word-break: break-all;">
              If the button above does not work, copy and paste this URL into your browser:<br>
              <a href="${resetUrl}" style="color: #58a6ff; text-decoration: underline;">${resetUrl}</a>
            </td>
          </tr>

          <tr style="border-top: 1px solid #21262d;">
            <td style="padding-top: 20px; font-size: 12px; line-height: 1.5; color: #6e7681;">
              If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.<br><br>
              &copy; ${new Date().getFullYear()} FlowSpace. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Builds plaintext message for password reset email.
 *
 * @param {{ userName: string, resetUrl: string }} params
 */
function buildResetEmailText({ userName, resetUrl }) {
  const safeName = userName ? String(userName).trim() : 'there';
  return `Hi ${safeName},

We received a request to reset your password for your FlowSpace account.

Use the link below to choose a new password. This link is valid for 1 hour:
${resetUrl}

If you did not request a password reset, you can safely ignore this email.

— The FlowSpace Team`;
}

/**
 * Dispatches a password reset email.
 *
 * In production with SMTP configured, attempts to send via Nodemailer.
 * In dev/test/demo mode (or when SMTP is unconfigured), logs the URL to console
 * and returns a preview URL for automated testing and local debugging.
 *
 * @param {{ toEmail: string, userName?: string, resetUrl: string }} options
 * @returns {Promise<{ success: boolean, previewUrl?: string, messageId?: string }>}
 */
export async function sendPasswordResetEmail({ toEmail, userName = '', resetUrl }) {
  const html = buildResetEmailHtml({ userName, resetUrl });
  const text = buildResetEmailText({ userName, resetUrl });

  // If production SMTP is configured in environment
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    try {
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM || '"FlowSpace" <no-reply@flowspace.dev>',
        to: toEmail,
        subject: 'Reset your FlowSpace password',
        text,
        html,
      });

      return { success: true, messageId: info.messageId };
    } catch (err) {
      if (!env.isTest) {
        console.error('[EmailService] SMTP delivery failed, falling back to log:', err.message);
      }
    }
  }

  // Development, test, or demo mode
  if (!env.isTest) {
    console.log(`\n============================================================`);
    console.log(`📧 [FlowSpace Email Dispatch] Password Reset`);
    console.log(`To: ${toEmail}`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log(`============================================================\n`);
  }

  return {
    success: true,
    previewUrl: resetUrl,
  };
}

export default {
  sendPasswordResetEmail,
};
