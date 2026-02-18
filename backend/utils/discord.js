import axios from "axios";

// Post event announcement to Discord
export const postToDiscord = async (webhookUrl, event) => {
  try {
    if (!webhookUrl) return;

    const embed = {
      title: `🎉 New Event: ${event.name}`,
      description: event.description?.substring(0, 200) + (event.description?.length > 200 ? "..." : ""),
      color: event.eventType === "merchandise" ? 0x9b59b6 : 0x3498db,
      fields: [
        {
          name: "📅 Event Type",
          value: event.eventType.charAt(0).toUpperCase() + event.eventType.slice(1),
          inline: true,
        },
        {
          name: "📆 Start Date",
          value: new Date(event.startDate).toLocaleDateString(),
          inline: true,
        },
        {
          name: "⏰ Registration Deadline",
          value: new Date(event.registrationDeadline).toLocaleDateString(),
          inline: true,
        },
        {
          name: "💰 Fee",
          value: event.registrationFee > 0 ? `₹${event.registrationFee}` : "Free",
          inline: true,
        },
      ],
      footer: {
        text: "Felicity Event Management System",
      },
      timestamp: new Date().toISOString(),
    };

    await axios.post(webhookUrl, {
      embeds: [embed],
    });

    console.log(`Event posted to Discord: ${event.name}`);
  } catch (error) {
    console.error("Error posting to Discord:", error.message);
    // Don't throw - Discord failure shouldn't break event creation
  }
};
