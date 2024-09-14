import User from "../models/user.model";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import generateTokenAndSetCookie from "../helpers/tokenAndCookie";
import { v2 as cloudinary } from "cloudinary";
import Post from "../models/post.model";

const signupUser = async (req, res) => {
  try {
    const { name, email, username, password } = req.body;
    const user = await User.findOne({
      $or: [{ email }, { username }],
    });
    if (user) {
      return res.status(400).json({ error: "User already exists" });
    }
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);
    const newUser = new User({
      name,
      email,
      username,
      password: hashPassword,
    });
    await newUser.save();
    const resUser = {
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      username: newUser.username,
      bio: newUser.bio,
      userProfileImg: newUser.userProfileImg,
    };
    if (newUser) {
      generateTokenAndSetCookie(newUser._id, res);
      return res.status(201).json({
        message: "signup successfully",
        user: resUser,
      });
    }
    res.status(400).json({ error: "Invalid user data" });
  } catch (err) {
    res.status(500).json({ error: err.message });
    console.log("Error in signupUser: ", err.message);
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    const isCorrectPassword = await bcrypt.compare(
      password,
      user?.password || ""
    );
    // console.log(user)
    if (!user || !isCorrectPassword) {
      return res.status(400).json({
        error: "Invalid email or password",
      });
    }
    if (user.isFrozen) {
      user.isFrozen = false;
      await user.save();
    }
    generateTokenAndSetCookie(user._id, res);
    const resUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      username: user.username,
      bio: user.bio,
      userProfileImg: user.userProfileImg,
    };
    return res.status(200).json({
      success: true,
      message: "login successfully",
      user: resUser,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
    console.log("Error in login User: ", err.message);
  }
};

const getUserProfile = async (req, res) => {
  // query is username or userId
  const { query } = req.params;
  try {
    let user;

    // query is userId
    if (mongoose.Types.ObjectId.isValid(query)) {
      user = await User.findOne({ _id: query })
        .select("-password")
        .select("-updatedAt");
    } else {
      // query is username
      user = await User.findOne({ username: query })
        .select("-password")
        .select("-updatedAt");
    }

    if (!user) return res.status(404).json({ error: "User not found" });

    res.status(200).json({ user, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
    console.log("Error in getUserProfile: ", err.message);
  }
};

const updateUser = async (req, res) => {
  const { name, email, username, bio } = req.body;
  let { userProfileImg } = req.body;
  const userId = req.user._id;
  try {
    let user = await User.findById(userId);
    if (!user) return res.status(400).json({ error: "User not found" });

    // Cannot update other people's profiles
    if (req.params.id !== userId.toString())
      return res
        .status(400)
        .json({ error: "You cannot update other user's profile" });

    if (userProfileImg) {
      try {
        if (user.userProfileImg) {
          await cloudinary.uploader.destroy(
            user.userProfileImg.split("/").pop().split(".")[0]
          );
        }
        const uploadedResponse = await cloudinary.uploader.upload(
          userProfileImg
        );
        userProfileImg = uploadedResponse.secure_url;
      } catch (uploadError) {
        console.log("Error uploading image:", uploadError);
        return res.status(500).json({ error: "Error uploading image" });
      }
    }

    user.name = name || user.name;
    user.email = email || user.email;
    user.username = username || user.username;
    user.userProfileImg = userProfileImg || user.userProfileImg;
    user.bio = bio || user.bio;

    user = await user.save();

    // Find all posts that this user replied and update username and userProfileImg fields

    await Post.updateMany(
      { "replies.userId": userId },
      {
        $set: {
          "replies.$[reply].username": user.username,
          "replies.$[reply].userProfileImg": user.userProfileImg,
        },
      },
      { arrayFilters: [{ "reply.userId": userId }] }
    );

    // password should be null in response
    user.password = null;

    res.status(200).json({
      user,
      message: "Update information successfully",
      success: true,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
    console.log("Error in updateUser: ", err);
  }
};

const updatePassword = async (req, res) => {
  const { password, newPassword } = req.body;
  const userId = req.user._id;
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(400).json({ error: "User not found" });
    if (req.params.id !== userId.toString())
      return res.status(400).json({ error: "You cannot update" });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);
    await User.updateOne({ _id: userId }, { password: hashedNewPassword });
    res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const followAndUnFollow = async (req, res) => {
  try {
    const { id } = req.params;
    const userToModify = await User.findById(id);
    const currentUser = await User.findById(req.user._id);

    if (id === req.user._id.toString())
      return res
        .status(400)
        .json({ error: "You cannot follow/unfollow yourself" });

    if (!userToModify || !currentUser)
      return res.status(400).json({ error: "User not found" });

    const isFollowing = currentUser.following.includes(id);

    if (isFollowing) {
      // Unfollow user
      await User.findByIdAndUpdate(id, { $pull: { followers: req.user._id } });
      await User.findByIdAndUpdate(req.user._id, { $pull: { following: id } });
      res.status(200).json({ message: "User unfollowed successfully" });
    } else {
      // Follow user
      await User.findByIdAndUpdate(id, { $push: { followers: req.user._id } });
      await User.findByIdAndUpdate(req.user._id, { $push: { following: id } });
      res.status(200).json({ message: "User followed successfully" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
    console.log("Error in follow: ", err.message);
  }
};
const logoutUser = (req, res) => {
  try {
    res.cookie("jwt", "", { maxAge: 1 });
    res
      .status(200)
      .json({ message: "User logged out successfully", success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
    console.log("Error in logout: ", err.message);
  }
};

const freezeAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    user.isFrozen = true;
    await user.save();

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getSuggestedUsers = async (req, res) => {
  try {
    // exclude the current user from suggested users array and exclude users that current user is already following
    const userId = req.user._id;

    const usersFollowedByYou = await User.findById(userId).select("following");

    const users = await User.aggregate([
      {
        $match: {
          _id: { $ne: userId },
        },
      },
      {
        $sample: { size: 10 },
      },
    ]);
    const filteredUsers = users.filter(
      (user) => !usersFollowedByYou.following.includes(user._id)
    );
    const suggestedUsers = filteredUsers.slice(0, 4);

    suggestedUsers.forEach((user) => (user.password = null));

    res.status(200).json(suggestedUsers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const searchUsers = async (req, res) => {
  try {
    const { user } = req.query;
    const currentUserId = req.user._id;
    if (!user || user.trim() === '') {
      return res.json([])
    }
    const regex = new RegExp(user, 'i')
    const users = await User.find({
      $and: [
        {
          $or: [
            { username: { $regex: regex } },
            { email: { $regex: regex } }
          ]
        },
        { _id: { $ne: currentUserId } } // Loại trừ currentUser
      ]
    }).select('name username userProfileImg _id').limit(5);
    if (users.length === 0) {
      return res.json([])
    }
    res.json(users);
  } catch (error) {
    console.error('error find users:', error);
    res.status(500).json({ error: error.message });
  }
}

export {
  signupUser,
  loginUser,
  logoutUser,
  followAndUnFollow,
  freezeAccount,
  updateUser,
  getUserProfile,
  getSuggestedUsers,
  updatePassword,
  searchUsers
};
