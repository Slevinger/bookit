/**
 * Copy rooms + bookings from one tenant to another (merging into the target).
 * Does NOT copy Google calendar sync mappings (let the target re-sync cleanly),
 * and does NOT delete the source. Usage:
 *   node scripts/migrate-tenant.mjs <SRC_TENANT_ID> <DST_TENANT_ID>
 */
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "node:fs";
import path from "node:path";

const [src, dst] = process.argv.slice(2);
if (!src || !dst) {
  console.error("Usage: node scripts/migrate-tenant.mjs <SRC_TENANT_ID> <DST_TENANT_ID>");
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

const copyCollection = async (name) => {
  const srcCol = db.collection("tenants").doc(src).collection(name);
  const dstCol = db.collection("tenants").doc(dst).collection(name);
  const snap = await srcCol.get();
  let n = 0;
  for (const doc of snap.docs) {
    await dstCol.doc(doc.id).set(doc.data(), { merge: true });
    n += 1;
  }
  console.log(`  copied ${n} ${name}`);
  return n;
};

console.log(`Project: ${key.project_id}`);
console.log(`Migrating ${src} -> ${dst}`);
await copyCollection("rooms");
await copyCollection("bookings");
console.log("Done. Source left intact; calendar mappings not copied (use 'Sync all' to re-sync).");
process.exit(0);
