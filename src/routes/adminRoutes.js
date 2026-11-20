
import express from "express";
import { ObjectId } from "mongodb";

import { db } from "../config/db.js";


import {
  verifyToken,
  verifyAdmin,
} from "../middlewares/authMiddleware.js";

const router = express.Router();

const batchesCollection = db.collection("tuitionBatches");

// =====================================
// COMMON ADMIN AUTHENTICATION
// =====================================

router.use(verifyToken, verifyAdmin);

// =====================================
// GET ALL PENDING BATCHES
// GET /api/admin/batches/pending
// =====================================

router.get("/batches/pending", async (req, res) => {
  try {
    const batches = await batchesCollection
      .find({ status: "pending" })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      total: batches.length,
      batches,
    });
  } catch (error) {
    console.error("Get pending batches error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch pending batches",
    });
  }
});

// =====================================
// APPROVE TUITION BATCH
// PATCH /api/admin/batches/:id/approve
// =====================================

router.patch("/batches/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid batch ID",
      });
    }

    const result = await batchesCollection.updateOne(
      {
        _id: new ObjectId(id),
        status: "pending",
      },
      {
        $set: {
          status: "approved",
          approvedAt: new Date(),
          approvedBy: req.user.id,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Pending batch not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Tuition batch approved successfully!",
    });
  } catch (error) {
    console.error("Approve batch error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to approve tuition batch",
    });
  }
});

// =====================================
// REJECT TUITION BATCH
// PATCH /api/admin/batches/:id/reject
// =====================================

router.patch("/batches/:id/reject", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid batch ID",
      });
    }

    const result = await batchesCollection.updateOne(
      {
        _id: new ObjectId(id),
        status: "pending",
      },
      {
        $set: {
          status: "rejected",
          rejectedAt: new Date(),
          rejectedBy: req.user.id,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Pending batch not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Tuition batch rejected successfully!",
    });
  } catch (error) {
    console.error("Reject batch error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to reject tuition batch",
    });
  }
});

// =====================================
// DELETE TUITION BATCH
// DELETE /api/admin/batches/:id
// =====================================

router.delete("/batches/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid batch ID",
      });
    }

    const result = await batchesCollection.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Tuition batch deleted successfully!",
    });
  } catch (error) {
    console.error("Admin delete batch error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete tuition batch",
    });
  }
});

export default router;
