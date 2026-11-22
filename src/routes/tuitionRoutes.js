
import express from "express";
import { ObjectId } from "mongodb";
import { db } from "../config/db.js";
import {
  verifyToken,
  verifyTutor,
} from "../middlewares/authMiddleware.js";

const router = express.Router();

const batchesCollection = db.collection("tuitionBatches");

// Escape special regex characters from search input
function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Normalize mode for the existing Frontend UI
function formatTuition(tuition) {
  return {
    ...tuition,
    mode:
      tuition.mode?.toLowerCase() === "online"
        ? "Online"
        : tuition.mode?.toLowerCase() === "offline"
          ? "Offline"
          : tuition.mode,
    isActive: tuition.isActive !== false,
  };
}

// ==========================================
// PUBLIC: Get approved and active tuitions
// GET /api/tuitions
// ==========================================
router.get("/", async (req, res) => {
  try {
    const {
      search = "",
      subject = "",
      classLevel = "",
      mode = "",
    } = req.query;

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);

    const limit = Math.min(
      50,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 12)
    );

    const skip = (page - 1) * limit;

    // Only approved and active tuition posts
    const filter = {
      status: "approved",
      isActive: { $ne: false },
    };

    // Search by title, subject, class, location or description
    if (typeof search === "string" && search.trim()) {
      const searchRegex = new RegExp(
        escapeRegex(search.trim()),
        "i"
      );

      filter.$or = [
        { title: searchRegex },
        { subject: searchRegex },
        { classLevel: searchRegex },
        { location: searchRegex },
        { description: searchRegex },
      ];
    }

    // Subject filter
    if (typeof subject === "string" && subject.trim()) {
      filter.subject = {
        $regex: `^${escapeRegex(subject.trim())}$`,
        $options: "i",
      };
    }

    // Class level filter
    if (typeof classLevel === "string" && classLevel.trim()) {
      filter.classLevel = {
        $regex: `^${escapeRegex(classLevel.trim())}$`,
        $options: "i",
      };
    }

    // Online / Offline filter
    if (
      typeof mode === "string" &&
      ["online", "offline"].includes(mode.toLowerCase())
    ) {
      filter.mode = {
        $regex: `^${mode.toLowerCase()}$`,
        $options: "i",
      };
    }

    const [tuitions, total] = await Promise.all([
      batchesCollection
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),

      batchesCollection.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      total,
      page,
      limit,
      pages: Math.max(1, Math.ceil(total / limit)),
      tuitions: tuitions.map(formatTuition),
    });
  } catch (error) {
    console.error("Get public tuitions error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load tuitions.",
    });
  }
});

// ==========================================
// TUTOR: Get my own tuition batches
// GET /api/tuitions/my
// ==========================================
router.get("/my", verifyToken, verifyTutor, async (req, res) => {
  try {
    const batches = await batchesCollection
      .find({ tutorId: req.user.id })
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      total: batches.length,
      tuitions: batches.map(formatTuition),
    });
  } catch (error) {
    console.error("Get my tuitions error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch your tuition posts.",
    });
  }
});

// ==========================================
// PUBLIC: Get one approved tuition
// GET /api/tuitions/:id
// ==========================================
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid tuition ID.",
      });
    }

    const tuition = await batchesCollection.findOne({
      _id: new ObjectId(id),
      status: "approved",
      isActive: { $ne: false },
    });

    if (!tuition) {
      return res.status(404).json({
        success: false,
        message: "Tuition not found or not available.",
      });
    }

    return res.status(200).json({
      success: true,
      tuition: formatTuition(tuition),
    });
  } catch (error) {
    console.error("Get tuition details error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load tuition details.",
    });
  }
});

export default router;
