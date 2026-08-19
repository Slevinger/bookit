/**
 * DESTRUCTIVE: deletes ALL tenant data (every `tenants/{id}` doc and its
 * `rooms`, `bookings`, `calendarSync` subcollections) plus any legacy top-level
 * `rooms`/`bookings`. Use for a clean slate. Run locally:
 *   node scripts/purge-all-tenants.mjs
 */
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const keyFile = fs
  .readdirSync(root)
  .find((f) => /^bookit-.*\.json$/.test(f) || f === "key.json");

if (!keyFile) {
  console.error("No service-account key file (bookit-*.json) found in project root.");
  process.exit(1);
}

const key = JSON.parse(fs.readFileSync(path.join(root, keyFile), "utf8"));
if (getApps().length === 0) {
  initializeApp({ credential: cert(key), projectId: key.project_id });
}

const db = getFirestore();
console.log(`Project: ${key.project_id}`);

const tenants = await db.collection("tenants").get();
console.log(`Deleting ${tenants.size} tenant(s) and all their subcollections...`);
for (const doc of tenants.docs) {
  await db.recursiveDelete(doc.ref);
  console.log(`  deleted tenant ${doc.id}`);
}

for (const name of ["rooms", "bookings"]) {
  const snap = await db.collection(name).get();
  if (snap.size > 0) {
    await db.recursiveDelete(db.collection(name));
    console.log(`Deleted ${snap.size} legacy top-level "${name}" docs.`);
  }
}

console.log("Purge complete. Firestore is now empty of tenant data.");
process.exit(0);
