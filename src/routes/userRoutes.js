
import express from "express";
import { ObjectId } from "mongodb";
import { db } from "../config/db.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

// =====================================
// UPDATE LOGGED-IN USER PROFILE
// PATCH /api/users/me
// =====================================

router.patch("/me", verifyToken, async (req, res) => {
  try {
    const { name, phone, bio, image } = req.body;

    // Validate name
    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Full name is required.",
      });
    }

    if (name.trim().length > 100) {
      return res.status(400).json({
        success: false,
        message: "Name cannot exceed 100 characters.",
      });
    }

    // Validate phone
    if (phone !== undefined && typeof phone !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number.",
      });
    }

    // Validate bio
    if (bio !== undefined && typeof bio !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid bio.",
      });
    }

    if (typeof bio === "string" && bio.length > 300) {
      return res.status(400).json({
        success: false,
        message: "Bio cannot exceed 300 characters.",
      });
    }

    // Validate image
    if (image !== undefined && typeof image !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid profile image.",
      });
    }

    const userId = req.user.id;

    const profileData = {
      userId,
      name: name.trim(),
      email: req.user.email,
      role: req.user.role,
      plan: req.user.plan || "free",
      phone: typeof phone === "string" ? phone.trim() : "",
      bio: typeof bio === "string" ? bio.trim() : "",
      image: typeof image === "string" ? image.trim() : "",
      updatedAt: new Date(),
    };

    const usersCollection = db.collection("users");

    await usersCollection.updateOne(
      { userId },
      {
        $set: profileData,
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    const updatedProfile = await usersCollection.findOne(
      { userId },
      { projection: { _id: 0 } }
    );

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      profile: updatedProfile,
    });
  } catch (error) {
    console.error("Profile update error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update profile.",
    });
  }
});

export default router;
