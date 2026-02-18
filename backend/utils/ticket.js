import QRCode from "qrcode";
import crypto from "crypto";

// Generate unique ticket ID
export const generateTicketId = () => {
  const timestamp = Date.now().toString(36);
  const randomPart = crypto.randomBytes(4).toString("hex");
  return `FEL-${timestamp}-${randomPart}`.toUpperCase();
};

// Generate QR code for ticket
export const generateQRCode = async (ticketId, eventId, userId) => {
  try {
    const qrData = JSON.stringify({
      ticketId,
      eventId: eventId.toString(),
      userId: userId.toString(),
      timestamp: Date.now(),
    });

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: "M",
      type: "image/png",
      width: 300,
      margin: 2,
    });

    return qrCodeDataUrl;
  } catch (error) {
    console.error("Error generating QR code:", error);
    return null;
  }
};

