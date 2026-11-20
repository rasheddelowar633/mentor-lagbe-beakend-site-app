
import express from "express";
import { ObjectId } from "mongodb";

import { db } from "../config/db.js";
import {
  verifyToken,
  verifyTutor,
} from "../middlewares/authMiddleware.js";

const router = express.Router();

const batchesCollection = db.collection("tuitionBatches");

// =====================================
// COMMON AUTHENTICATION
// =====================================

router.use(verifyToken, verifyTutor);

// =====================================
// CREATE TUITION BATCH
// POST /api/tutor/batches
// =====================================

router.post("/batches", async (req, res) => {
  try {
    const {
      title,
      subject,
      classLevel,
      description,
      monthlyFee,
      location,
      mode,
      seats,
      schedule,
    } = req.body;

    // Required field validation
    if (
      !title ||
      !subject ||
      !classLevel ||
      monthlyFee === undefined ||
      !location ||
      !mode
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    if (
      typeof monthlyFee !== "number" ||
      !Number.isFinite(monthlyFee) ||
      monthlyFee < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Monthly fee must be a valid non-negative number",
      });
    }

    if (!["online", "offline"].includes(mode.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: "Mode must be online or offline",
      });
    }

    if (
      seats !== undefined &&
      (!Number.isInteger(seats) || seats < 1)
    ) {
      return res.status(400).json({
        success: false,
        message: "Seats must be a positive integer",
      });
    }

    if (
      schedule !== undefined &&
      !Array.isArray(schedule)
    ) {
      return res.status(400).json({
        success: false,
        message: "Schedule must be an array",
      });
    }

    const newBatch = {
      title: title.trim(),
      subject: subject.trim(),
      classLevel: classLevel.trim(),
      description: description?.trim() || "",
      monthlyFee,
      location: location.trim(),
      mode: mode.toLowerCase(),
      seats: seats ?? 1,
      schedule: schedule ?? [],

      tutorId: req.user.id,
      tutorEmail: req.user.email,

      status: "pending",

      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await batchesCollection.insertOne(newBatch);

    res.status(201).json({
      success: true,
      message: "Tuition batch created successfully! Waiting for admin approval.",
      batch: {
        _id: result.insertedId,
        ...newBatch,
      },
    });
  } catch (error) {
    console.error("Create batch error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create tuition batch",
    });
  }
});

// =====================================
// GET MY TUITION BATCHES
// GET /api/tutor/batches
// =====================================

router.get("/batches", async (req, res) => {
  try {
    const batches = await batchesCollection
      .find({ tutorId: req.user.id })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      total: batches.length,
      batches,
    });
  } catch (error) {
    console.error("Get batches error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch tuition batches",
    });
  }
});

// =====================================
// UPDATE MY TUITION BATCH
// PATCH /api/tutor/batches/:id
// =====================================

router.patch("/batches/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid batch ID",
      });
    }

    const allowedFields = [
      "title",
      "subject",
      "classLevel",
      "description",
      "monthlyFee",
      "location",
      "mode",
      "seats",
      "schedule",
    ];

    const updateData = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided for update",
      });
    }

    if (
      updateData.monthlyFee !== undefined &&
      (
        typeof updateData.monthlyFee !== "number" ||
        !Number.isFinite(updateData.monthlyFee) ||
        updateData.monthlyFee < 0
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Monthly fee must be a valid non-negative number",
      });
    }

    if (
      updateData.mode !== undefined &&
      (
        typeof updateData.mode !== "string" ||
        !["online", "offline"].includes(updateData.mode.toLowerCase())
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Mode must be online or offline",
      });
    }

    if (
      updateData.seats !== undefined &&
      (!Number.isInteger(updateData.seats) || updateData.seats < 1)
    ) {
      return res.status(400).json({
        success: false,
        message: "Seats must be a positive integer",
      });
    }

    if (
      updateData.schedule !== undefined &&
      !Array.isArray(updateData.schedule)
    ) {
      return res.status(400).json({
        success: false,
        message: "Schedule must be an array",
      });
    }

    if (updateData.mode !== undefined) {
      updateData.mode = updateData.mode.toLowerCase();
    }

    for (const field of [
      "title",
      "subject",
      "classLevel",
      "description",
      "location",
    ]) {
      if (updateData[field] !== undefined) {
        if (typeof updateData[field] !== "string") {
          return res.status(400).json({
            success: false,
            message: `${field} must be a string`,
          });
        }

        updateData[field] = updateData[field].trim();
      }
    }

    updateData.updatedAt = new Date();

    const updatedBatch = await batchesCollection.findOneAndUpdate(
      {
        _id: new ObjectId(id),
        tutorId: req.user.id,
      },
      {
        $set: updateData,
      },
      {
        returnDocument: "after",
      }
    );

    if (!updatedBatch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found or you are not allowed to update it",
      });
    }

    res.status(200).json({
      success: true,
      message: "Tuition batch updated successfully!",
      batch: updatedBatch,
    });
  } catch (error) {
    console.error("Update batch error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update tuition batch",
    });
  }
});

// =====================================
// DELETE MY TUITION BATCH
// DELETE /api/tutor/batches/:id
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
      tutorId: req.user.id,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Batch not found or you are not allowed to delete it",
      });
    }

    res.status(200).json({
      success: true,
      message: "Tuition batch deleted successfully!",
    });
  } catch (error) {
    console.error("Delete batch error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete tuition batch",
    });
  }
});

export default router;
