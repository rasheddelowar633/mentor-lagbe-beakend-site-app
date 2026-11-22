
import express from "express";
import { ObjectId } from "mongodb";

import { db, authDb } from "../config/db.js";

import {
  verifyToken,
  verifyAdmin,
} from "../middlewares/authMiddleware.js";

const router = express.Router();

// =====================================
// COLLECTIONS
// =====================================

const usersCollection = db.collection("users");
const authUsersCollection = authDb.collection("user");

// Allowed roles
const ALLOWED_ROLES = ["student", "tutor", "admin"];

// =====================================
// HELPER: FIND AUTH USER BY ID
// =====================================

const findAuthUserById = async (id) => {
  const conditions = [{ _id: id }];

  if (ObjectId.isValid(id)) {
    conditions.push({
      _id: new ObjectId(id),
    });
  }

  return authUsersCollection.findOne({
    $or: conditions,
  });
};

// =====================================
// GET ALL REGISTERED USERS
// GET /api/users
// ADMIN ONLY
// =====================================

router.get("/", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const users = await authUsersCollection
      .find(
        {},
        {
          projection: {
            name: 1,
            email: 1,
            role: 1,
            plan: 1,
            image: 1,
            createdAt: 1,
            emailVerified: 1,
          },
        }
      )
      .sort({ createdAt: -1 })
      .toArray();

    const formattedUsers = users.map((user) => {
      const id = user._id?.toString() || user.id;

      return {
        _id: id,
        id,
        name: user.name || "",
        email: user.email || "",
        role: user.role || "student",
        plan: user.plan || "free",
        image: user.image || "",
        createdAt: user.createdAt || null,
        emailVerified: Boolean(user.emailVerified),
      };
    });

    return res.status(200).json({
      success: true,
      total: formattedUsers.length,
      users: formattedUsers,
    });
  } catch (error) {
    console.error("Get all users error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve users.",
    });
  }
});

// =====================================
// UPDATE USER ROLE
// PATCH /api/users/:id/role
// ADMIN ONLY
// =====================================

router.patch(
  "/:id/role",
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;

      // Validate user ID
      if (!id) {
        return res.status(400).json({
          success: false,
          message: "User ID is required.",
        });
      }

      // Validate role
      if (!ALLOWED_ROLES.includes(role)) {
        return res.status(400).json({
          success: false,
          message: "Invalid role. Allowed roles: student, tutor, admin.",
        });
      }

      // Prevent changing own role
      const currentAdmin = await findAuthUserById(req.user.id);

      if (
        currentAdmin &&
        currentAdmin._id?.toString() === id
      ) {
        return res.status(403).json({
          success: false,
          message: "You cannot change your own role.",
        });
      }

      // Find target user
      const targetUser = await findAuthUserById(id);

      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: "User not found.",
        });
      }

      // Update role in Better Auth database
      await authUsersCollection.updateOne(
        { _id: targetUser._id },
        {
          $set: {
            role,
            updatedAt: new Date(),
          },
        }
      );

      return res.status(200).json({
        success: true,
        message: `User role updated to ${role}.`,
        user: {
          _id: targetUser._id.toString(),
          id: targetUser._id.toString(),
          name: targetUser.name || "",
          email: targetUser.email || "",
          role,
          plan: targetUser.plan || "free",
        },
      });
    } catch (error) {
      console.error("Update user role error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to update user role.",
      });
    }
  }
);

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
