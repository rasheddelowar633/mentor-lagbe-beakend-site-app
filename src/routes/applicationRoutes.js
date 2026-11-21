
import express from "express";
import { ObjectId } from "mongodb";
import { db } from "../config/db.js";

import {
  verifyToken,
  verifyStudent,
  verifyTutor,
} from "../middlewares/authMiddleware.js";

const router = express.Router();

const applicationsCollection = db.collection("applications");
const batchesCollection = db.collection("tuitionBatches");

// ==========================================
// STUDENT: Submit a tuition application
// POST /api/applications
// ==========================================
router.post("/", verifyToken, verifyStudent, async (req, res) => {
  try {
    const {
      tuitionId,
      studentPhone,
      preferredSchedule,
      studentNote,
    } = req.body;

    if (!tuitionId || !ObjectId.isValid(tuitionId)) {
      return res.status(400).json({
        success: false,
        message: "Valid tuition ID is required.",
      });
    }

    if (!studentPhone?.trim() || !preferredSchedule?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Phone number and preferred schedule are required.",
      });
    }

    // Find the tuition post
    const tuition = await batchesCollection.findOne({
      _id: new ObjectId(tuitionId),
    });

    if (!tuition) {
      return res.status(404).json({
        success: false,
        message: "Tuition not found.",
      });
    }

    if (tuition.status !== "approved") {
      return res.status(400).json({
        success: false,
        message: "You can only apply to approved tuitions.",
      });
    }

    // Prevent duplicate applications
    const existingApplication = await applicationsCollection.findOne({
      studentId: req.user.id,
      tuitionId: tuition._id.toString(),
    });

    if (existingApplication) {
      return res.status(409).json({
        success: false,
        message: "You have already applied to this tuition.",
      });
    }

    const now = new Date();

    const application = {
      tuitionId: tuition._id.toString(),
      tuitionTitle: tuition.title || "Tuition",
      subject: tuition.subject || "",
      monthlyFee: tuition.monthlyFee || 0,

      tutorId: tuition.tutorId,
      tutorEmail: tuition.tutorEmail || "",
      tutorName: tuition.tutorName || "",

      studentId: req.user.id,
      studentName:
        req.user.name || req.user.email?.split("@")[0] || "Student",
      studentEmail: req.user.email || "",
      studentPhone: studentPhone.trim(),

      preferredSchedule: preferredSchedule.trim(),
      studentNote: studentNote?.trim() || "",

      status: "pending",
      appliedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    const result = await applicationsCollection.insertOne(application);

    return res.status(201).json({
      success: true,
      message: "Application submitted successfully.",
      application: {
        ...application,
        _id: result.insertedId,
      },
    });
  } catch (error) {
    console.error("Submit application error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to submit application.",
    });
  }
});

// ==========================================
// STUDENT: Get my applications
// GET /api/applications/my
// ==========================================
router.get("/my", verifyToken, verifyStudent, async (req, res) => {
  try {
    const applications = await applicationsCollection
      .find({ studentId: req.user.id })
      .sort({ appliedAt: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      applications,
    });
  } catch (error) {
    console.error("Get my applications error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load your applications.",
    });
  }
});

// ==========================================
// TUTOR: Get applications received
// GET /api/applications/received
// ==========================================
router.get(
  "/received",
  verifyToken,
  verifyTutor,
  async (req, res) => {
    try {
      // Find only this tutor's tuition posts
      const myTuitions = await batchesCollection
        .find({ tutorId: req.user.id })
        .project({ _id: 1 })
        .toArray();

      const tuitionIds = myTuitions.map((tuition) =>
        tuition._id.toString()
      );

      if (tuitionIds.length === 0) {
        return res.status(200).json({
          success: true,
          applications: [],
        });
      }

      const applications = await applicationsCollection
        .find({ tuitionId: { $in: tuitionIds } })
        .sort({ appliedAt: -1 })
        .toArray();

      return res.status(200).json({
        success: true,
        applications,
      });
    } catch (error) {
      console.error("Get received applications error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to load received applications.",
      });
    }
  }
);

// ==========================================
// TUTOR: Accept or reject an application
// PATCH /api/applications/:id
// ==========================================
router.patch(
  "/:id",
  verifyToken,
  verifyTutor,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid application ID.",
        });
      }

      if (!["accepted", "rejected"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status must be accepted or rejected.",
        });
      }

      const application = await applicationsCollection.findOne({
        _id: new ObjectId(id),
      });

      if (!application) {
        return res.status(404).json({
          success: false,
          message: "Application not found.",
        });
      }

      // Check that this tuition belongs to the logged-in tutor
      const tuition = await batchesCollection.findOne({
        _id: new ObjectId(application.tuitionId),
        tutorId: req.user.id,
      });

      if (!tuition) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to manage this application.",
        });
      }

      if (application.status !== "pending") {
        return res.status(409).json({
          success: false,
          message: "This application has already been reviewed.",
        });
      }

      const result = await applicationsCollection.updateOne(
        {
          _id: new ObjectId(id),
          status: "pending",
        },
        {
          $set: {
            status,
            updatedAt: new Date(),
          },
        }
      );

      if (result.modifiedCount === 0) {
        return res.status(409).json({
          success: false,
          message: "Application status could not be updated.",
        });
      }

      return res.status(200).json({
        success: true,
        message: `Application ${status} successfully.`,
      });
    } catch (error) {
      console.error("Update application error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to update application.",
      });
    }
  }
);

// ==========================================
// STUDENT: Cancel a pending application
// DELETE /api/applications/:id
// ==========================================
router.delete(
  "/:id",
  verifyToken,
  verifyStudent,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid application ID.",
        });
      }

      const application = await applicationsCollection.findOne({
        _id: new ObjectId(id),
      });

      if (!application) {
        return res.status(404).json({
          success: false,
          message: "Application not found.",
        });
      }

      if (application.studentId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "You cannot cancel another student's application.",
        });
      }

      if (application.status !== "pending") {
        return res.status(409).json({
          success: false,
          message: "Only pending applications can be cancelled.",
        });
      }

      await applicationsCollection.deleteOne({
        _id: new ObjectId(id),
        studentId: req.user.id,
        status: "pending",
      });

      return res.status(200).json({
        success: true,
        message: "Application cancelled successfully.",
      });
    } catch (error) {
      console.error("Cancel application error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to cancel application.",
      });
    }
  }
);

export default router;
