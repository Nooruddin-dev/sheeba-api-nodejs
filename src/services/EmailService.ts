// emailService.js
import nodemailer from 'nodemailer';
import { EmailConfiguration } from '../configurations/config';

// Create a transporter
const transporter = nodemailer.createTransport({
    host: EmailConfiguration.host, // For Gmail
    port: EmailConfiguration.Port,
    secure: true, // true for 465, false for other ports
    auth: {
        user: EmailConfiguration.Username, // Your email
        pass: EmailConfiguration.Password // Your email password or App Password
    }
});

// Function to send email
export const sendEmailFunc = async (to: string, subject: string, html: any) => {
    const mailOptions = {
        from: EmailConfiguration.From, // sender address
        to: to, // list of receivers
        subject: subject, // Subject line
        html: html // HTML body
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Message sent: %s', info.messageId);
    } catch (error) {
        console.error('Error sending email:', error);
    }
};
