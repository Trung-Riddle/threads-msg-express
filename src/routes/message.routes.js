import express from "express";
import protectedRoute from "../middlewares/protectedRoute";
import {
  sendMessage,
  getConversations,
  getMessage,
} from "../controllers/message.controllers";

const router = express.Router();

router.get("/conversations", protectedRoute, getConversations);
router.get("/:otherUserId", protectedRoute, getMessage);
router.post("/", protectedRoute, sendMessage);

export default router;
