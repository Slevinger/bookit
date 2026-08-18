/**
 * One-off: delete the pre-multi-tenant top-level `rooms` and `bookings`
 * collections. Tenant data now lives under `tenants/{tenantId}/...` and is not
 * touched. Run once locally:
 *   node scripts/purge-legacy-data.mjs
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

for (const name of ["rooms", "bookings"]) {
  const snap = await db.collection(name).get();
  await db.recursiveDelete(db.collection(name));
  console.log(`Deleted ${snap.size} docs from top-level "${name}".`);
}

console.log("Legacy top-level data purged.");
process.exit(0);
