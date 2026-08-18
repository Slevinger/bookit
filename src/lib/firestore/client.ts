import { getApps, initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import fs from "node:fs";
import path from "node:path";

/**
 * Credential resolution order:
 * 1. GOOGLE_APPLICATION_CREDENTIALS env var (standard ADC, used on Cloud Run
 *    implicitly via the attached service account — no key file needed there)
 * 2. A local service-account key file matching bookit-*.json in the project
 *    root (local development convenience)
 */
const resolveLocalKeyFile = (): string | null => {
  const explicit = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (explicit && fs.existsSync(explicit)) return explicit;
  const root = process.cwd();
  const candidate = fs
    .readdirSync(root)
    .find((f) => /^bookit-.*\.json$/.test(f) || f === "key.json");
  return candidate ? path.join(root, candidate) : null;
};

let db: Firestore | null = null;

export const getDb = (): Firestore => {
  if (db) return db;
  if (getApps().length === 0) {
    const keyFile = process.env.K_SERVICE ? null : resolveLocalKeyFile();
    if (keyFile) {
      const key = JSON.parse(fs.readFileSync(keyFile, "utf8"));
      initializeApp({ credential: cert(key), projectId: key.project_id });
    } else {
      initializeApp({ credential: applicationDefault() });
    }
  }
  db = getFirestore();
  db.settings({ ignoreUndefinedProperties: true });
  return db;
};
