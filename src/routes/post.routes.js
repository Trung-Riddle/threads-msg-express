import express from "express";
import protectedRoute from "../middlewares/protectedRoute";
import { createPost, deletePost, getFeedPosts, getPost, getUserPosts, likeUnlikePost, replyToPost } from "../controllers/post.controllers";

const router = express.Router();

router.post("/create", protectedRoute, createPost);
router.get("/feed", protectedRoute, getFeedPosts);
router.get("/:id",protectedRoute, getPost);
router.get("/user/:username", getUserPosts);
router.delete("/:id", protectedRoute, deletePost);
router.put("/like/:id", protectedRoute, likeUnlikePost);
router.put("/reply/:id", protectedRoute, replyToPost);

export default router;