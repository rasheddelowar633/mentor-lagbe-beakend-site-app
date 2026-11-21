
import express from "express";
import { db } from "../config/db.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

const usersCollection = db.collection("users");

// =====================================
// GET LOGGED-IN USER PROFILE
// GET /api/users/me
// =====================================

router.get("/me", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const profile = await usersCollection.findOne(
      { userId },
      { projection: { _id: 0 } }
    );

    // If profile does not exist, return JWT user information.
    const user = profile || {
      userId: req.user.id,
      name: req.user.name || "",
      email: req.user.email,
      role: req.user.role,
      plan: req.user.plan || "free",
      phone: "",
      bio: "",
      image: "",
    };

    return res.status(200).json({
      success: true,
      message: "Profile loaded successfully.",
      user,
      profile: user,
    });
  } catch (error) {
    console.error("Profile loading error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load profile.",
    });
  }
});

// =====================================
// UPDATE LOGGED-IN USER PROFILE
// PATCH /api/users/me
// =====================================

router.patch("/me", verifyToken, async (req, res) => {
  try {
    const { name, phone, bio, image } = req.body;

    // Validate name
    if (
      name !== undefined &&
      (typeof name !== "string" || !name.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid full name.",
      });
    }

    if (typeof name === "string" && name.trim().length > 100) {
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

    const existingProfile = await usersCollection.findOne({ userId });

    const profileData = {
      userId,
      email: req.user.email,
      role: req.user.role,
      plan: req.user.plan || "free",
      updatedAt: new Date(),
    };

    if (name !== undefined) {
      profileData.name = name.trim();
    } else if (!existingProfile) {
      profileData.name = req.user.name || "";
    }

    if (phone !== undefined) {
      profileData.phone = phone.trim();
    } else if (!existingProfile) {
      profileData.phone = "";
    }

    if (bio !== undefined) {
      profileData.bio = bio.trim();
    } else if (!existingProfile) {
      profileData.bio = "";
    }

    if (image !== undefined) {
      profileData.image = image.trim();
    } else if (!existingProfile) {
      profileData.image = "";
    }

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
      user: updatedProfile,
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
