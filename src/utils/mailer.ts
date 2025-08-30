import nodemailer from "nodemailer";

export const sendMail = async (to: string, subject: string, text: string) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: 'elitesportsjaipur@gmail.com',
      pass: 'mugg yxwz incm rbqo',
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
  });
};
