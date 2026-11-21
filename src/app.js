
import express from "express";
import cors from "cors";
import helmet from "helmet";
import "dotenv/config";

import {
  verifyToken,
  verifyTutor,
  verifyStudent,
  verifyAdmin,
} from "./middlewares/authMiddleware.js";

import { toNodeHandler } from "better-auth/node";
import { auth } from "./config/auth.js";

import tutorRoutes from "./routes/tutorRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import applicationRoutes from "./routes/applicationRoutes.js";

import tuitionRoutes from "./routes/tuitionRoutes.js";

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);

// Better Auth route
app.all("/api/auth/*splat", toNodeHandler(auth));

// JSON middleware
app.use(express.json());

// API Routes
app.use("/api/student", studentRoutes);
app.use("/api/tutor", tutorRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/tuitions", tuitionRoutes);



// Home route
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to MentorLagbe API!",
  });
});

// JWT PROTECTED TEST ROUTE
app.get("/api/protected", verifyToken, (req, res) => {
  res.status(200).json({
    success: true,
    message: "JWT verification successful!",
    user: req.user,
  });
});

// TUTOR PROTECTED ROUTE
app.get(
  "/api/tutor-test",
  verifyToken,
  verifyTutor,
  (req, res) => {
    res.status(200).json({
      success: true,
      message: "Tutor authorization successful!",
      user: req.user,
    });
  }
);

// STUDENT PROTECTED ROUTE
app.get(
  "/api/student-test",
  verifyToken,
  verifyStudent,
  (req, res) => {
    res.status(200).json({
      success: true,
      message: "Student authorization successful!",
      user: req.user,
    });
  }
);

// ADMIN PROTECTED ROUTE
app.get(
  "/api/admin-test",
  verifyToken,
  verifyAdmin,
  (req, res) => {
    res.status(200).json({
      success: true,
      message: "Admin authorization successful!",
      user: req.user,
    });
  }
);

export default app;