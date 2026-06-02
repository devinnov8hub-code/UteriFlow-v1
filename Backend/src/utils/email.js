import nodemailer from 'nodemailer';
import { AppError } from '../errors/index.js';


const createTransporter = () => {
  const host = (process.env.SMTP_HOST || '').trim();
  const port = parseInt((process.env.SMTP_PORT || '587').trim());
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').trim();

  if (!host || !user || !pass) {
  
    console.warn(
      '[Email] SMTP not configured — printing to console instead.\n' +
      `  SMTP_HOST="${host}" SMTP_USER="${user}" SMTP_PASS="${pass ? '***set***' : 'MISSING'}"`
    );
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    
    tls: { rejectUnauthorized: false },
   
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
};

const getFrom = () => {
  const name = (process.env.SMTP_FROM_NAME || 'UteriFlow').trim();
  const email = (process.env.SMTP_FROM_EMAIL || 'onboarding@resend.dev').trim();
  return `"${name}" <${email}>`;
};


const sendMail = async ({ to, subject, text, html, throwOnFail = true }) => {
  const transporter = createTransporter();

  if (!transporter) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`[Email - NO SMTP] To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`\n${text}\n`);
    console.log(`${'─'.repeat(60)}\n`);
    return;
  }

  try {
    const info = await transporter.sendMail({ from: getFrom(), to, subject, text, html });
    console.log(`[Email] Sent "${subject}" to ${to} — messageId: ${info.messageId}`);
  } catch (err) {
    console.error(`[Email] FAILED to send "${subject}" to ${to}:`, err.message);
    if (throwOnFail) {
      throw new AppError(
        `Failed to send email to ${to}. Please try again.`,
        500,
        'EMAIL_SEND_FAILED'
      );
    }
   
  }
};


const emailLayout = (title, bodyContent) => `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 20px;">
      <tr>
        <td align="center">
          <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
            <tr>
              <td align="center" style="padding-bottom:24px;border-bottom:1px solid #f3f4f6;">
                <h1 style="margin:0;font-size:22px;font-weight:700;color:#7c3aed;">UteriFlow</h1>
                <p style="margin:4px 0 0;font-size:11px;color:#9ca3af;letter-spacing:1px;text-transform:uppercase;">${title}</p>
              </td>
            </tr>
            <tr>
              <td style="padding-top:28px;">
              <p style="margin:0 0 20px;font-size:15px;font-weight:600;color:#111827;text-align:center"> Hi Queen 👑</p>
                ${bodyContent}
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-top:28px;border-top:1px solid #f3f4f6;margin-top:28px;">
                <p style="margin:0;font-size:11px;color:#d1d5db;">© ${new Date().getFullYear()} UteriFlow · All rights reserved.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

export const sendOTPEmail = async (to, otpCode) => {
  await sendMail({
    to,
    subject: 'Your UteriFlow Verification Code',
    text: `Hi Queen, Your verification code is: ${otpCode}\n\nThis code expires in 10 minutes.\n\nIf you did not request this, please ignore this email.`,
    html: emailLayout('Email Verification', `
      <h2 style="margin:0 0 8px;font-size:18px;font-weight:600;color:#111827;text-align:center;">Verify your email address</h2>
      <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;text-align:center;">
        Enter the code below to verify your email. It expires in <strong>10 minutes</strong>.
      </p>
      <div style="background:#f5f3ff;border-radius:10px;padding:24px 40px;text-align:center;margin-bottom:24px;">
        <span style="font-size:40px;font-weight:700;color:#7c3aed;letter-spacing:10px;">${otpCode}</span>
      </div>
      <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
        If you didn't request this code, you can safely ignore this email.
      </p>
    `),
    throwOnFail: true,
  });
};


export const sendPasswordResetOTPEmail = async (to, otpCode) => {
  await sendMail({
    to,
    subject: 'Reset your UteriFlow password',
    text: `Hi Queen, Your password reset code is: ${otpCode}\n\nThis code expires in 10 minutes.\n\nIf you did not request this, please ignore this email.`,
    html: emailLayout('Password Reset', `
      <h2 style="margin:0 0 8px;font-size:18px;font-weight:600;color:#111827;text-align:center;">Reset your password</h2>
      <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;text-align:center;">
        Use the 6-digit code below to reset your password. It expires in <strong>10 minutes</strong>.
      </p>
      <div style="background:#fef2f2;border-radius:10px;padding:24px 40px;text-align:center;margin-bottom:24px;">
        <span style="font-size:40px;font-weight:700;color:#dc2626;letter-spacing:10px;">${otpCode}</span>
      </div>
      <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
        If you didn't request a password reset, you can safely ignore this email.
      </p>
    `),
    throwOnFail: true, 
  });
};


export const sendWelcomeEmail = async (to, displayName) => {
  const name = displayName || 'there';
  await sendMail({
    to,
    subject: 'Welcome to UteriFlow 🌸',
    text: `Hi Queen, ${name},\n\nWelcome to UteriFlow! Your account has been created successfully.\n\nStart by completing your profile to get personalised insights.\n\nThe UteriFlow Team`,
    html: emailLayout('Welcome', `
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#111827;text-align:center;">Welcome to UteriFlow, ${name}! 🌸</h2>
      <p style="margin:0 0 16px;font-size:14px;color:#6b7280;line-height:1.7;text-align:center;">
        Your account has been created successfully. We're so glad you're here.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
        <tr>
          <td style="background:#f5f3ff;border-radius:8px;padding:16px 20px;">
            <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#7c3aed;">✅ What's next?</p>
            <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">
              1. Complete your onboarding profile<br>
              2. Log your first period cycle<br>
              3. Track your health focus areas
            </p>
          </td>
        </tr>
      </table>
      <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
        If you didn't create this account, please contact us immediately.
      </p>
    `),
    throwOnFail: false,
  });
};


export const sendPasswordChangedEmail = async (to) => {
  const time = new Date().toUTCString();
  await sendMail({
    to,
    subject: 'Your UteriFlow password was changed',
    text: `Hi Queen, Your password was successfully changed on ${time}.\n\nIf you did not make this change, please contact us immediately and reset your password.`,
    html: emailLayout('Security Alert', `
      <h2 style="margin:0 0 8px;font-size:18px;font-weight:600;color:#111827;text-align:center;">Your password was changed</h2>
      <p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.6;text-align:center;">
        Your UteriFlow account password was successfully updated.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
        <tr>
          <td style="background:#f0fdf4;border-left:3px solid #16a34a;border-radius:4px;padding:14px 16px;">
            <p style="margin:0;font-size:13px;color:#15803d;">🔒 Changed at: <strong>${time}</strong></p>
          </td>
        </tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="background:#fef2f2;border-left:3px solid #dc2626;border-radius:4px;padding:14px 16px;">
            <p style="margin:0;font-size:13px;color:#b91c1c;">⚠️ If you did not make this change, please reset your password immediately.</p>
          </td>
        </tr>
      </table>
    `),
    throwOnFail: false,
  });
};


export const sendOnboardingCompleteEmail = async (to, displayName) => {
  const name = displayName || 'there';
  await sendMail({
    to,
    subject: 'Your UteriFlow profile is complete ',
    text: `Hi Queen, ${name},\n\nYou've completed your UteriFlow profile! You're all set to start tracking your cycle.\n\nThe UteriFlow Team`,
    html: emailLayout('Profile Complete', `
      <h2 style="margin:0 0 8px;font-size:18px;font-weight:600;color:#111827;text-align:center;">Your profile is complete! 🎉</h2>
      <p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.6;text-align:center;">
        Great work, ${name}! You're now ready to track your cycle and get personalised insights.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="background:#f5f3ff;border-radius:8px;padding:16px 20px;">
            <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#7c3aed;">🌸 You're all set to:</p>
            <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">
              • Log and track your period cycles<br>
              • Monitor your hormonal health journey<br>
              • Get insights tailored to your focus areas
            </p>
          </td>
        </tr>
      </table>
    `),
    throwOnFail: false,
  });
};
