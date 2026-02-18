import nodemailer from "nodemailer";

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Generic send email function
export const sendEmail = async ({ to, subject, html }) => {
  try {
    const mailOptions = {
      from: `"Felicity Events" <${process.env.SMTP_FROM || "noreply@felicity.com"}>`,
      to,
      subject,
      html,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}`);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
};

// Send ticket email to participant
export const sendTicketEmail = async (user, event, ticket) => {
  try {
    const mailOptions = {
      from: `"Felicity Events" <${process.env.SMTP_FROM || "noreply@felicity.com"}>`,
      to: user.email,
      subject: `Your Ticket for ${event.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Your Ticket is Confirmed! 🎉</h1>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin: 0 0 15px 0;">${event.name}</h2>
            <p><strong>Ticket ID:</strong> ${ticket.ticketId}</p>
            <p><strong>Event Type:</strong> ${event.eventType}</p>
            <p><strong>Date:</strong> ${new Date(event.startDate).toLocaleDateString()}</p>
            <p><strong>Participant:</strong> ${user.firstName} ${user.lastName}</p>
            ${ticket.variant ? `<p><strong>Variant:</strong> ${ticket.variant.size} - ${ticket.variant.color}</p>` : ""}
          </div>

          ${ticket.qrCode ? `<div style="text-align: center;"><img src="${ticket.qrCode}" alt="QR Code" style="max-width: 200px;"/></div>` : ""}

          <p style="color: #666; font-size: 14px;">
            Please keep this ticket safe. You'll need to present the QR code at the event.
          </p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;"/>
          <p style="color: #999; font-size: 12px;">
            This is an automated message from the Felicity Event Management System.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Ticket email sent to ${user.email}`);
  } catch (error) {
    console.error("Error sending ticket email:", error);
    // Don't throw - email failure shouldn't break registration
  }
};

