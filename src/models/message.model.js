import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
	{
		conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation" },
		sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
		message: String,
		seen: {
			type: Boolean,
			default: false,
		},
		img: {
			type: String,
			default: "",
		},
		audio: {
			type: String,
			default: "",
		}
	},
	{ timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);

export default Message;