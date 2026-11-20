
import { MongoClient } from "mongodb";
import "dotenv/config";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is missing in .env file");
}

const client = new MongoClient(uri);

export const db = client.db(
  process.env.DB_NAME || "mentorLagbe"
);

export const authDb = client.db(
  process.env.AUTH_DB_NAME || "mentorLagbe_auth"
);

export const connectDB = async () => {
  try {
    await client.connect();

    await db.command({ ping: 1 });
    await authDb.command({ ping: 1 });

    console.log("MongoDB connected successfully!");
    console.log("Database:", process.env.DB_NAME || "mentorLagbe");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    throw error;
  }
};

export default client;
