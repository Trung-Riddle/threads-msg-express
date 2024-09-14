import User from "../models/user.model";
import Post from "../models/post.model";
import { v2 as cloudinary } from "cloudinary";
import { uploadToCloudinaryImg, uploadToCloudinaryAudio } from "../helpers/fn";
import mongoose from "mongoose";

const createPost = async (req, res) => {
  try {
    const { postedBy, text, img, audio } = req.body;
    const user = await User.findById(postedBy);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    if (user._id.toString() !== req.user._id.toString()) {
      return res.status(401).json({ error: "Unauthorized to create post" });
    }

    const dataPost = { postedBy };
    if (text) dataPost.text = text;
    if (img) {
      const url = await uploadToCloudinaryImg(img);
      dataPost.img = url;
    }

    if (audio) {
      const url = await uploadToCloudinaryAudio(audio);
      dataPost.audio = url;
    }

    const newPost = new Post(dataPost);
    await newPost.save();

    res.status(201).json({ newPost, message: "Created post successfully" });
  } catch (err) {
    res.status(500).json({ error: err });
    console.log("loi o post");
  }
};

const getPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.status(200).json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (post.postedBy.toString() !== req.user._id.toString()) {
      return res.status(401).json({ error: "Unauthorized to delete post" });
    }

    if (post.img) {
      const publicId = post.img.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(`threads_img/${publicId}`);
    }
    if (post.audio) {
      const publicId = post.audio.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(`threads_audio/${publicId}`);
    }

    // Xóa file của các replies từ Cloudinary
    for (const reply of post.replies) {
      if (reply.img) {
        const publicId = reply.img.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(`threads_img/${publicId}`);
      }
      if (reply.audio) {
        const publicId = reply.audio.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(`threads_audio/${publicId}`);
      }
    }

    await Post.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Post deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
const likeUnlikePost = async (req, res) => {
  try {
    const { id: postId } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const userLikedPost = post.likes.includes(userId);

    if (userLikedPost) {
      // Unlike post
      await Post.updateOne({ _id: postId }, { $pull: { likes: userId } });
      res.status(200).json({ message: "Post unliked successfully" });
    } else {
      // Like post
      await Post.updateOne({ _id: postId }, { $push: { likes: userId } });
      res.status(200).json({ message: "Post liked successfully" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const replyToPost = async (req, res) => {
  try {
    const { text } = req.body;
    const postId = req.params.id;
    const userId = req.user._id;
    const userProfileImg = req.user.userProfileImg;
    const username = req.user.username;

    if (!text) {
      return res.status(400).json({ error: "Text field is required" });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const reply = { userId, text, userProfileImg, username };

    post.replies.push(reply);
    await post.save();

    res.status(200).json(reply);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getFeedPosts = async (req, res) => {
  try {
    const userId = req.user._id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 8
    const skip = (page - 1) * limit
    const user = await User.findById(userId);
    // console.log(user)
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const following = user.following;

    const feedPosts = await Post.find({ postedBy: { $in: following } }).sort({
      createdAt: -1,
    }).skip(skip).limit(limit)

    // console.log(feedPosts)


    const totalPosts = await Post.countDocuments({ postedBy: { $in: following }})
    // console.log(totalPosts)
    const totalPages = Math.ceil(totalPosts / limit);

    res.status(200).json({
      posts: feedPosts,
      currentPage: page,
      totalPages,
      totalPosts,
      hasNextPage: page < totalPages
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getUserPosts = async (req, res) => {
  const { username } = req.params;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = 8;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const totalPosts = await Post.countDocuments({ postedBy: user._id });
    const totalPages = Math.max(1, Math.ceil(totalPosts / limit));

    // Đảm bảo page không vượt quá totalPages
    const validPage = Math.min(page, totalPages);
    const skip = (validPage - 1) * limit;

    const posts = await Post.find({ postedBy: user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      posts,
      currentPage: validPage,
      totalPages,
      totalPosts,
      postsPerPage: limit,
      hasNextPage: validPage < totalPages,
      hasPrevPage: validPage > 1
    });
  } catch (error) {
    res.status(500).json({ error: 'error in feed post user' });
  }
};



export {
  createPost,
  getPost,
  deletePost,
  likeUnlikePost,
  replyToPost,
  getUserPosts,
  getFeedPosts
};
