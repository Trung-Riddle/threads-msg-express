import { v2 as cloudinary } from "cloudinary";

export const getPublicId = (url) => {
  // Extract the part of the URL after the last '/' and before the file extension
  const parts = url.split("/");
  const fileName = parts[parts.length - 1];
  const publicId = fileName.split(".")[0];

  // Include the folder in the public ID
  const folder = parts[parts.length - 2]; // Assumes the folder is the second-to-last part of the URL
  return `${folder}/${publicId}`;
};

export const uploadToCloudinaryAudio = async (base64) => {
  try {
    if (!base64) {
      throw new Error("Base64 string is undefined or null");
    }

    if (base64.length === 0) {
      throw new Error("Base64 string is empty");
    }

    const audioBase64 = `data:audio/mp3;base64,${base64}`;

    const result = await cloudinary.uploader.upload(audioBase64, {
      resource_type: "auto",
      folder: "threads_audio",
    });

    return result.secure_url;
  } catch (error) {
    console.error("Error in audio uploadToCloudinary:", error);
    throw error;
  }
};
export const uploadToCloudinaryImg = async (base64) => {
  try {
    if (!base64) {
      throw new Error("Base64 string is undefined or null");
    }

    if (base64.length === 0) {
      throw new Error("Base64 string is empty");
    }

    const result = await cloudinary.uploader.upload(base64, {
      folder: "threads_img",
    });

    return result.secure_url;
  } catch (error) {
    console.error("Error in img uploadToCloudinary:", error);
    throw error;
  }
};
