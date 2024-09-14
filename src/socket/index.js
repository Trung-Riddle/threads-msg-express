import { createServer } from "http";
import { Server } from "socket.io";
import express from "express";
import Message from "../models/message.model";
import Conversation from "../models/conversation.model";

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

export const getRecipientSocketId = (recipientId) => {
  return userSocketMap[recipientId];
};

const userSocketMap = {};

io.on("connection", (socket) => {
  console.log("user connected", socket.id);
  const userId = socket.handshake.query.userId;

  if (userId != "undefined") userSocketMap[userId] = socket.id;
  io.emit("getUsersOnline", Object.keys(userSocketMap));

  socket.on("markMessageAsSeen", async ({ conversationId, userId }) => {
    try {
      await Message.updateMany(
        {
          conversationId,
          seen: false,
        },
        {
          $set: {
            seen: true,
          },
        }
      );
      await Conversation.updateOne(
        { _id: conversationId },
        {
          $set: {
            "lastMessage.seen": true,
          },
        }
      );
      io.to(userSocketMap[userId]).emit("messagesSeen", { conversationId });
    } catch (error) {
      console.log(error);
    }
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { app, io, server };
