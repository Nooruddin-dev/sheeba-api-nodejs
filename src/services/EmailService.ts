import nodemailer from 'nodemailer';
import { EmailConfiguration } from '../configurations/config';

const getTransporter = () => {
  const { Host, Port, User, AppPassword } = EmailConfiguration;

  if (!User || !AppPassword) {
    throw new Error(
      'Gmail app password is not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in .env'
    );
  }

  return nodemailer.createTransport({
    host: Host,
    port: Port,
    secure: true,
    auth: {
      user: User,
      pass: AppPassword,
    },
  });
};

export const sendEmailFunc = async (to: string, subject: string, html: any) => {
  const mailOptions = {
    from: EmailConfiguration.From,
    to,
    cc: EmailConfiguration.Cc || undefined,
    subject,
    html,
  };

  try {
    const transporter = getTransporter();
    await transporter.sendMail(mailOptions);
    console.log(
      'Email sent successfully to %s from %s with subject %s',
      to,
      EmailConfiguration.From,
      subject
    );
  } catch (error) {
    console.log(
      'Error sending email to %s from %s with subject %s',
      to,
      EmailConfiguration.From,
      subject
    );
    throw error;
  }
};
