const Mailjet = require('node-mailjet');
const logger = require('../utils/logger');
const { maskEmail } = require('../utils/helpers');

if (!process.env.MAILJET_API_KEY || !process.env.MAILJET_API_SECRET) {
  logger.error('Missing MAILJET_API_KEY or MAILJET_API_SECRET in .env');
  throw new Error('Missing MAILJET_API_KEY or MAILJET_API_SECRET in .env');
}
if (!process.env.MAILJET_SENDER_EMAIL) {
  logger.error('Missing MAILJET_SENDER_EMAIL in .env (must be a verified Mailjet sender)');
  throw new Error('Missing MAILJET_SENDER_EMAIL in .env (must be a verified Mailjet sender)');
}

const mailjet = Mailjet.apiConnect(process.env.MAILJET_API_KEY, process.env.MAILJET_API_SECRET);

async function sendInviteEmail({ toEmail, companyName, role, inviteLink, invitedByEmail }) {
  logger.info(
    {
      toEmail: maskEmail(toEmail),
      companyName,
      role,
      invitedBy: maskEmail(invitedByEmail),
    },
    `Sending invite email to ${maskEmail(toEmail)} for ${companyName}`
  );

  try {
    const response = await mailjet.post('send', { version: 'v3.1' }).request({
      Messages: [
        {
          From: { Email: process.env.MAILJET_SENDER_EMAIL, Name: 'EnvGuard' },
          To: [{ Email: toEmail }],
          Subject: `${invitedByEmail} invited you to join ${companyName} on EnvGuard`,
          TextPart:
            `You've been invited to join ${companyName} on EnvGuard as ${role}.\n\n` +
            `Accept your invite: ${inviteLink}\n\nThis link expires in 7 days.`,
          HTMLPart: `
            <p>${invitedByEmail} invited you to join <strong>${companyName}</strong> on EnvGuard as <strong>${role}</strong>.</p>
            <p><a href="${inviteLink}">Accept your invite</a></p>
            <p style="color:#888;font-size:12px;">This link expires in 7 days.</p>
          `,
        },
      ],
    });

    logger.info(
      {
        toEmail: maskEmail(toEmail),
        companyName,
        messageId: response?.body?.Messages?.[0]?.MessageID,
      },
      `Invite email sent successfully to ${maskEmail(toEmail)}`
    );
    return response;
  } catch (error) {
    logger.error(
      {
        toEmail: maskEmail(toEmail),
        companyName,
        error: error.message,
        stack: error.stack,
      },
      `Failed to send invite email to ${maskEmail(toEmail)}`
    );
    throw error;
  }
}

async function sendPasswordResetEmail({ toEmail, resetLink }) {
  await mailjet.post('send', { version: 'v3.1' }).request({
    Messages: [
      {
        From: { Email: process.env.MAILJET_SENDER_EMAIL, Name: 'EnvGuard' },
        To: [{ Email: toEmail }],
        Subject: 'Reset your EnvGuard password',
        TextPart:
          `We received a request to reset your EnvGuard password.\n\n` +
          `Reset it here: ${resetLink}\n\n` +
          `This link expires in 1 hour. If you didn't request this, you can ignore this email.`,
        HTMLPart: `
          <p>We received a request to reset your EnvGuard password.</p>
          <p><a href="${resetLink}">Reset your password</a></p>
          <p style="color:#888;font-size:12px;">This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
        `,
      },
    ],
  });
}

async function sendVerificationEmail({ toEmail, verificationLink }) {
  await mailjet.post('send', { version: 'v3.1' }).request({
    Messages: [
      {
        From: { Email: process.env.MAILJET_SENDER_EMAIL, Name: 'EnvGuard' },
        To: [{ Email: toEmail }],
        Subject: 'Verify your EnvGuard email address',
        TextPart:
          `Welcome to EnvGuard!\n\n` +
          `Please verify your email address by clicking this link:\n${verificationLink}\n\n` +
          `This link expires in 24 hours.`,
        HTMLPart: `
          <p>Welcome to EnvGuard!</p>
          <p>Please verify your email address by clicking the link below:</p>
          <p><a href="${verificationLink}">Verify my email</a></p>
          <p style="color:#888;font-size:12px;">This link expires in 24 hours.</p>
        `,
      },
    ],
  });
}

module.exports = { sendInviteEmail, sendPasswordResetEmail, sendVerificationEmail };