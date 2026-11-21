import "dotenv/config";
import { MongoClient } from "mongodb";
import { writeFile } from "node:fs/promises";

const client = new MongoClient(process.env.MONGODB_URI);

try {
  await client.connect();

  const db = client.db(process.env.AUTH_DB_NAME || "mentorLagbe_auth");
  const documents = await db.collection("jwks").find({}).toArray();

  if (documents.length === 0) {
    console.log("No JWKS documents found.");
  } else {
    await writeFile(
      "./mentorLagbe-jwks-backup.json",
      JSON.stringify(documents, null, 2),
      "utf8"
    );

    console.log(`Backup successful! Documents: ${documents.length}`);
    console.log("Saved: mentorLagbe-jwks-backup.json");
  }
} catch (error) {
  console.error("Backup failed:", error.message);
} finally {
  await client.close();
}
