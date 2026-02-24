import { Server } from "socket.io";

let ioInstance;
const onlineUsers = {}; // room -> Set of userId strings

export const initSocket = (server) => {
  ioInstance = new Server(server, {
    cors: { origin: process.env.FRONTEND_URL || "http://localhost:5173", credentials: true },
  });

  ioInstance.on("connection", socket => {
    const { user } = socket.handshake.query;
    // user is JSON string with { _id, firstName, lastName }
    let parsed;
    try { parsed = user ? JSON.parse(user) : null; } catch { parsed = null; }

    socket.on("joinEvent", eventId => {
      if (!eventId) return;
      socket.join(`event_${eventId}`);
      if (parsed) {
        onlineUsers[eventId] = onlineUsers[eventId] || new Set();
        onlineUsers[eventId].add(parsed._id);
        // broadcast updated online list
        ioInstance.to(`event_${eventId}`).emit("onlineUsers", Array.from(onlineUsers[eventId]));
      }
    });

    socket.on("leaveEvent", eventId => {
      socket.leave(`event_${eventId}`);
      if (parsed && onlineUsers[eventId]) {
        onlineUsers[eventId].delete(parsed._id);
        ioInstance.to(`event_${eventId}`).emit("onlineUsers", Array.from(onlineUsers[eventId]));
      }
    });

    socket.on("typing", ({ eventId, messageId }) => {
      if (eventId) {
        socket.to(`event_${eventId}`).emit("userTyping", { user: parsed, messageId });
      }
    });

    socket.on("stopTyping", ({ eventId, messageId }) => {
      if (eventId) {
        socket.to(`event_${eventId}`).emit("userStopTyping", { user: parsed, messageId });
      }
    });

    socket.on("disconnect", () => {
      // cleanup all rooms
      if (parsed) {
        for (const room of Object.keys(onlineUsers)) {
          onlineUsers[room].delete(parsed._id);
          ioInstance.to(`event_${room}`).emit("onlineUsers", Array.from(onlineUsers[room]));
        }
      }
    });
  });
};

export const getIO = () => {
  if (!ioInstance) throw new Error("Socket.io not initialized");
  return ioInstance;
};