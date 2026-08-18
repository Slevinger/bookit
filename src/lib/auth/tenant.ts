import "server-only";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/firestore/client";
import { auth } from "./auth";

const TENANTS = "tenants";

/** Per-instance cache so we only touch Firestore for a tenant's first request. */
const provisioned = new Set<string>();

interface TenantOwner {
  email?: string | null;
  name?: string | null;
}

/**
 * Ensures `tenants/{tenantId}` exists. The `plan`/`status` fields are the hook
 * for future billing; `requireTenant` is the single chokepoint where a paywall
 * would later be enforced.
 */
const ensureTenant = async (tenantId: string, owner: TenantOwner): Promise<void> => {
  if (provisioned.has(tenantId)) return;
  const ref = getDb().collection(TENANTS).doc(tenantId);
  const doc = await ref.get();
  if (!doc.exists) {
    await ref.set({
      email: owner.email ?? null,
      name: owner.name ?? null,
      createdAt: new Date().toISOString(),
      plan: "free",
      status: "active",
    });
  }
  provisioned.add(tenantId);
};

/**
 * Resolves the current tenant for a Server Component or Server Action,
 * redirecting to login when there is no session. Provisions the tenant doc on
 * first use.
 */
export const requireTenant = async (): Promise<string> => {
  const session = await auth();
  const tenantId = session?.user?.tenantId;
  if (!tenantId) redirect("/login");
  await ensureTenant(tenantId, session.user);
  return tenantId;
};
