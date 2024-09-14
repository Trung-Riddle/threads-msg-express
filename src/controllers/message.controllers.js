import { v2 as cloudinary } from "cloudinary";
import Conversation from "../models/conversation.model";
import Message from "../models/message.model";
import { uploadToCloudinaryAudio, uploadToCloudinaryImg } from "../helpers/fn";
import { getRecipientSocketId, io } from "../socket";

const sendMessage = async (req, res) => {
  try {
    const { recipientId, message, img, audio } = req.body;
    const senderId = req.user._id;

    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, recipientId] },
    });
    if (!conversation) {
      conversation = new Conversation({
        participants: [senderId, recipientId],
        lastMessage: {
          text: message,
          sender: senderId,
        },
      });
      await conversation.save();
    }
    const dataMessage = {
      message,
      conversationId: conversation._id,
      sender: senderId,
      img: "",
      audio: "",
    };
    if (img) {
      const url = await uploadToCloudinaryImg(img);
      dataMessage.img = url;
    }
    if (audio) {
      const url = await uploadToCloudinaryAudio(audio);
      dataMessage.audio = url;
    }
    const newMessage = new Message(dataMessage);

    await Promise.all([
      newMessage.save(),
      conversation.updateOne({
        lastMessage: {
          message,
          sender: senderId,
        },
      }),
    ]);
    const recipientSocketId = getRecipientSocketId(recipientId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getMessage = async (req, res) => {
  const { otherUserId } = req.params;
  const userId = req.user._id;
  try {
    const conversation = await Conversation.findOne({
      participants: { $all: [userId, otherUserId] },
    });

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const messages = await Message.find({
      conversationId: conversation._id,
    }).sort({ createdAt: 1 });
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getConversations = async (req, res) => {
  const userId = req.user._id;
  try {
    const conversations = await Conversation.find({
      participants: userId,
    }).populate({
      path: "participants",
      select: "username userProfileImg",
    });

    // remove the current user from the participants array
    conversations.forEach((conversation) => {
      conversation.participants = conversation.participants.filter(
        (participant) => participant._id.toString() !== userId.toString()
      );
    });
    res.status(200).json(conversations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export { sendMessage, getConversations, getMessage };
