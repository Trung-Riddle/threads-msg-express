import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { app, server } from "./socket";
import appRoute from "./routes";
import connectDB from "./db/connect";
import { v2 as cloudinary } from "cloudinary";
import cors from 'cors'

dotenv.config();
connectDB();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
// Middlewares
app.use(cors({
  origin: process.env.CLIENT_URL,
  methods: ['POST', 'PUT', 'DELETE', 'GET', 'PATCH'],
  credentials: true
}))
app.use(express.json({ limit: "50mb" })); // To parse JSON data in the req.body
app.use(express.urlencoded({ extended: true })); // To parse form data in the req.body
app.use(cookieParser());

appRoute(app);

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log("listening on http://localhost:", PORT);
});
