
import express from "express";
import { db } from "../config/db.js";
import {
  verifyToken,
  verifyAdmin,
} from "../middlewares/authMiddleware.js";

const router = express.Router();

// =====================================
// GET ALL PAYMENTS - ADMIN ONLY
// GET /api/payments
// =====================================

router.get("/", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const payments = await db
      .collection("payments")
      .find({})
      .sort({ paidAt: -1, createdAt: -1 })
      .toArray();

    const formattedPayments = payments.map((payment) => ({
      _id: payment._id,

      userName: payment.userName || "Unknown User",
      userEmail: payment.userEmail || "",
      userRole: payment.userRole || "",

      planName: payment.planName || "",
      amount: Number(payment.amount || 0),
      currency: payment.currency || "usd",

      transactionId:
        payment.transactionId ||
        payment.paymentIntentId ||
        payment.stripeSessionId ||
        payment._id?.toString(),

      paidAt: payment.paidAt || payment.createdAt || null,
      status: payment.status || "unknown",
    }));

    return res.status(200).json({
      success: true,
      total: formattedPayments.length,
      payments: formattedPayments,
    });
  } catch (error) {
    console.error("Get payments error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve payments",
    });
  }
});

export default router;
