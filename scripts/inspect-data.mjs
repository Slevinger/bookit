/**
 * Read-only: list tenants and their data counts, plus any legacy top-level
 * collections. Safe to run repeatedly:
 *   node scripts/inspect-data.mjs
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
console.log(`Project: ${key.project_id}\n`);

const tenants = await db.collection("tenants").get();
console.log(`tenants: ${tenants.size}`);
for (const doc of tenants.docs) {
  const d = doc.data() ?? {};
  const [rooms, bookings] = await Promise.all([
    doc.ref.collection("rooms").get(),
    doc.ref.collection("bookings").get(),
  ]);
  console.log(
    `  ${doc.id}  email=${d.email ?? "-"}  name=${d.name ?? "-"}  ` +
      `rooms=${rooms.size}  bookings=${bookings.size}  ` +
      `calendarConnected=${Boolean(d.googleCalendar?.refreshToken)}`,
  );
}

for (const name of ["rooms", "bookings"]) {
  const snap = await db.collection(name).get();
  console.log(`legacy top-level "${name}": ${snap.size}`);
}

process.exit(0);
