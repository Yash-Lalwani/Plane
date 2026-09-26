export type EmailContent = {
  subject: string;
  html: string;
  text: string;
};

export const verificationEmail = (
  username: string,
  link: string,
): EmailContent => ({
  subject: "Verify your Plane email",
  text: `Hi ${username},\n\nVerify your email by opening this link:\n${link}\n\nThe link expires in 20 minutes.`,
  html: `<p>Hi ${username},</p>
<p>Verify your email by clicking the link below. The link expires in 20 minutes.</p>
<p><a href="${link}">Verify email</a></p>`,
});

export const passwordResetEmail = (
  username: string,
  link: string,
): EmailContent => ({
  subject: "Reset your Plane password",
  text: `Hi ${username},\n\nReset your password by opening this link:\n${link}\n\nThe link expires in 20 minutes. If you did not ask for this, you can ignore this email.`,
  html: `<p>Hi ${username},</p>
<p>Reset your password by clicking the link below. The link expires in 20 minutes.</p>
<p><a href="${link}">Reset password</a></p>
<p>If you did not ask for this, you can ignore this email.</p>`,
});
