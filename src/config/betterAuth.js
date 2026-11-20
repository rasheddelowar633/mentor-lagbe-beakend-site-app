
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { jwt } from "better-auth/plugins";

import client, { authDb } from "./db.js";

export const auth = betterAuth({
  database: mongodbAdapter(authDb, {
    client,
  }),

  secret: process.env.BETTER_AUTH_SECRET,

  baseURL: process.env.BETTER_AUTH_URL,

  trustedOrigins: [
    process.env.CLIENT_URL || "http://localhost:3000",
  ],

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },

  plugins: [
    jwt(),
  ],
});
