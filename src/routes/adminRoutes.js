
import express from "express";
import { ObjectId } from "mongodb";

import { db, authDb } from "../config/db.js";

import {
  verifyToken,
  verifyAdmin,
} from "../middlewares/authMiddleware.js";

const router = express.Router();

const batchesCollection = db.collection("tuitionBatches");
const usersCollection = authDb.collection("user");

// =====================================
// COMMON ADMIN AUTHENTICATION
// =====================================

router.use(verifyToken, verifyAdmin);

// =====================================
// GET ADMIN DASHBOARD STATISTICS
// GET /api/admin/stats
// =====================================

router.get("/stats", async (req, res) => {
  try {
    const [
      totalUsers,
      totalTutors,
      pendingTuitions,
      approvedTuitions,
    ] = await Promise.all([
      usersCollection.countDocuments({}),
      usersCollection.countDocuments({ role: "tutor" }),
      batchesCollection.countDocuments({ status: "pending" }),
      batchesCollection.countDocuments({ status: "approved" }),
    ]);

    // Stripe revenue will be connected after confirming
    // the payment collection structure.
    const stripeRevenue = 0;

    const stats = {
      totalUsers,
      totalTutors,
      pendingTuitions,
      approvedTuitions,
      stripeRevenue,
    };

    res.status(200).json({
      success: true,
      stats,

      // Top-level values are also provided for frontend compatibility.
      ...stats,
    });
  } catch (error) {
    console.error("Admin stats error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch admin statistics",
    });
  }
});

// =====================================
// GET ALL TUITION BATCHES
// GET /api/admin/tuitions
// =====================================

router.get("/tuitions", async (req, res) => {
  try {
    const { status } = req.query;

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(
      50,
      Math.max(1, Number(req.query.limit) || 12)
    );

    const filter = {};

    if (
      status &&
      ["pending", "approved", "rejected"].includes(status)
    ) {
      filter.status = status;
    }

    const total = await batchesCollection.countDocuments(filter);

    const tuitions = await batchesCollection
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    res.status(200).json({
      success: true,
      total,
      page,
      limit,
      pages: Math.max(1, Math.ceil(total / limit)),

      // Both names are provided for compatibility.
      tuitions,
      batches: tuitions,
    });
  } catch (error) {
    console.error("Admin get tuitions error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch tuition batches",
    });
  }
});

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
