
import express from "express";
import { ObjectId } from "mongodb";
import { db } from "../config/db.js";
import {
  verifyToken,
  verifyStudent,
} from "../middlewares/authMiddleware.js";

const router = express.Router();

const bookmarksCollection = db.collection("bookmarks");
const batchesCollection = db.collection("tuitionBatches");

// ==========================================
// GET MY BOOKMARKED TUITIONS
// GET /api/bookmarks/my
// ==========================================
router.get("/my", verifyToken, verifyStudent, async (req, res) => {
  try {
    const bookmarks = await bookmarksCollection
      .find({ studentId: req.user.id })
      .sort({ createdAt: -1 })
      .toArray();

    if (bookmarks.length === 0) {
      return res.status(200).json({
        success: true,
        total: 0,
        tuitions: [],
      });
    }

    const tuitionIds = bookmarks.map((item) => item.tuitionId);

    const tuitions = await batchesCollection
      .find({
        _id: { $in: tuitionIds },
        status: "approved",
        isActive: { $ne: false },
      })
      .toArray();

    return res.status(200).json({
      success: true,
      total: tuitions.length,
      tuitions,
    });
  } catch (error) {
    console.error("Get bookmarked tuitions error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load saved tuitions.",
    });
  }
});

// ==========================================
// SAVE A TUITION
// POST /api/bookmarks/:tuitionId
// ==========================================
router.post("/:tuitionId", verifyToken, verifyStudent, async (req, res) => {
  try {
    const { tuitionId } = req.params;

    if (!ObjectId.isValid(tuitionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid tuition ID.",
      });
    }

    const tuition = await batchesCollection.findOne({
      _id: new ObjectId(tuitionId),
      status: "approved",
      isActive: { $ne: false },
    });

    if (!tuition) {
      return res.status(404).json({
        success: false,
        message: "Tuition not found or not available.",
      });
    }

    const result = await bookmarksCollection.updateOne(
      {
        studentId: req.user.id,
        tuitionId: new ObjectId(tuitionId),
      },
      {
        $setOnInsert: {
          studentId: req.user.id,
          tuitionId: new ObjectId(tuitionId),
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    return res.status(200).json({
      success: true,
      message: "Tuition saved successfully.",
      alreadySaved: result.upsertedCount === 0,
    });
  } catch (error) {
    console.error("Save tuition error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to save tuition.",
    });
  }
});

// ==========================================
// REMOVE A BOOKMARK
// DELETE /api/bookmarks/:tuitionId
// ==========================================
router.delete(
  "/:tuitionId",
  verifyToken,
  verifyStudent,
  async (req, res) => {
    try {
      const { tuitionId } = req.params;

      if (!ObjectId.isValid(tuitionId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid tuition ID.",
        });
      }

      await bookmarksCollection.deleteOne({
        studentId: req.user.id,
        tuitionId: new ObjectId(tuitionId),
      });

      return res.status(200).json({
        success: true,
        message: "Bookmark removed successfully.",
      });
    } catch (error) {
      console.error("Remove bookmark error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to remove bookmark.",
      });
    }
  }
);

export default router;
