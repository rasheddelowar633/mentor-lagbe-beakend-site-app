
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { jwt } from "better-auth/plugins";

import { authDb } from "./db.js";

export const auth = betterAuth({
  database: mongodbAdapter(authDb),

  // Better Auth Debug Logger
  logger: {
    disabled: false,
    level: "debug",
    log: (level, message, ...args) => {
      console.log(`[Better Auth ${level}] ${message}`, ...args);
    },
  },

  secret: process.env.BETTER_AUTH_SECRET,

  baseURL: process.env.BETTER_AUTH_URL,

  trustedOrigins: [
    process.env.CLIENT_URL || "http://localhost:3000",
  ],

  // Cross-site cookie configuration for production
  advanced: {
    useSecureCookies: true,
    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
      httpOnly: true,
    },
  },

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },

  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "student",
        input: false,
      },

      plan: {
        type: "string",
        required: true,
        defaultValue: "free",
        input: false,
      },

      phone: {
        type: "string",
        required: false,
        input: false,
      },

      bio: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },

  databaseHooks: {
    user: {
      create: {
        before: async (user, ctx) => {
          const requestedRole = ctx?.body?.accountType;

          // Only student and tutor registration are allowed.
          // Admin role can never be assigned through public signup.
          const role =
            requestedRole === "tutor" ? "tutor" : "student";

          return {
            data: {
              ...user,
              role,
              plan: "free",
            },
          };
        },
      },
    },
  },

  plugins: [
    jwt({
      jwt: {
        definePayload: ({ user }) => ({
          id: user.id,
          email: user.email,
          role: user.role,
          plan: user.plan,
        }),
      },
    }),
  ],
});
