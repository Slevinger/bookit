/**
 * DESTRUCTIVE: delete specific tenants (and their subcollections) by id. Usage:
 *   node scripts/delete-tenants.mjs <TENANT_ID> [<TENANT_ID> ...]
 */
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "node:fs";
import path from "node:path";

const ids = process.argv.slice(2);
if (ids.length === 0) {
  console.error("Usage: node scripts/delete-tenants.mjs <TENANT_ID> [<TENANT_ID> ...]");
  process.exit(1);
}

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

for (const id of ids) {
  await db.recursiveDelete(db.collection("tenants").doc(id));
  console.log(`deleted tenant ${id}`);
}
process.exit(0);
