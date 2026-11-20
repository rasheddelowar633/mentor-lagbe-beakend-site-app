
import express from "express";

import { db } from "../config/db.js";

import {
  verifyToken,
  verifyStudent,
} from "../middlewares/authMiddleware.js";

const router = express.Router();

const batchesCollection = db.collection("tuitionBatches");

// =====================================
// COMMON AUTHENTICATION
// =====================================

router.use(verifyToken, verifyStudent);

// =====================================
// GET ALL APPROVED TUITION BATCHES
// GET /api/student/batches
// =====================================

router.get("/batches", async (req, res) => {
  try {
    const batches = await batchesCollection
      .find({ status: "approved" })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      total: batches.length,
      batches,
    });
  } catch (error) {
    console.error("Get approved batches error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch tuition batches",
    });
  }
});

export default router;
