
export const WEB_APP_URL = process.env.WEB_APP_URL || '';
export const ROOT_EMAIL = process.env.ROOT_EMAIL || '';

export const EmailConfiguration = {
  From: process.env.GMAIL_USER || '',
  Cc: process.env.GMAIL_CC || 'sheebaprinter@gmail.com',
  Host: 'smtp.gmail.com',
  Port: 465,
  User: process.env.GMAIL_USER || '',
  AppPassword: process.env.GMAIL_APP_PASSWORD || '',
};
