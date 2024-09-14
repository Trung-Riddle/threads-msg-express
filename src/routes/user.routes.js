import express from "express";
import {
  followAndUnFollow,
  freezeAccount,
  getSuggestedUsers,
  getUserProfile,
  loginUser,
  logoutUser,
  searchUsers,
  signupUser,
  updatePassword,
  updateUser,
} from "../controllers/user.controllers";
import protectedRoute from "../middlewares/protectedRoute";

const router = express.Router();

router.get("/profile/:query", getUserProfile);
router.get("/suggested", protectedRoute, getSuggestedUsers);
router.get("/search", protectedRoute, searchUsers);
router.post("/signup", signupUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.post("/follow/:id", protectedRoute, followAndUnFollow);
router.put("/update/:id", protectedRoute, updateUser);
router.patch("/password/:id", protectedRoute, updatePassword);
router.put("/freeze", protectedRoute, freezeAccount);

export default router;
