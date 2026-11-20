
import { createRemoteJWKSet, jwtVerify } from "jose";
import "dotenv/config";

const authBaseURL = process.env.BETTER_AUTH_URL;

if (!authBaseURL) {
  throw new Error("BETTER_AUTH_URL is missing in .env");
}

const JWKS = createRemoteJWKSet(
  new URL(`${authBaseURL}/api/auth/jwks`)
);

// =====================================
// VERIFY JWT TOKEN
// =====================================

export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Token is required",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Invalid token",
      });
    }

    const { payload } = await jwtVerify(token, JWKS, {
      issuer: authBaseURL,
      audience: authBaseURL,
    });

    if (!payload.id || !payload.role || !payload.email) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Invalid user information",
      });
    }

    req.user = {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      plan: payload.plan,
    };

    next();
  } catch (error) {
    console.error("JWT verification failed:", error.message);

    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid or expired token",
    });
  }
};

// =====================================
// VERIFY STUDENT
// =====================================

export const verifyStudent = (req, res, next) => {
  if (req.user?.role !== "student") {
    return res.status(403).json({
      success: false,
      message: "Forbidden: Student access only",
    });
  }

  next();
};

// =====================================
// VERIFY TUTOR
// =====================================

export const verifyTutor = (req, res, next) => {
  if (req.user?.role !== "tutor") {
    return res.status(403).json({
      success: false,
      message: "Forbidden: Tutor access only",
    });
  }

  next();
};

// =====================================
// VERIFY ADMIN
// =====================================

export const verifyAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Forbidden: Admin access only",
    });
  }

  next();
};
