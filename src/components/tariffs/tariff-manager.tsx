"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveTariffAction } from "@/lib/actions/tariffs";
import type { Tariff } from "@/lib/domain/types";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import {
  TariffEditor,
  draftToTariff,
  tariffToDraft,
  type TariffDraft,
} from "./tariff-editor";

export function TariffManager({ tariff }: { tariff: Tariff | null }) {
  const { t } = useI18n();
  const router = useRouter();
  const [draft, setDraft] = useState<TariffDraft>(() => tariffToDraft(tariff));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const result = await saveTariffAction(draftToTariff(draft));
    setSaving(false);
    if (result.ok) {
      toast.success(t("tariff.saved"));
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-6">
      <div className="grid gap-1">
        <h1 className="text-2xl font-bold">{t("tariff.title")}</h1>
        <p className="text-base text-muted-foreground">{t("tariff.description")}</p>
      </div>

      <div className="grid gap-5 rounded-2xl border bg-card p-5 shadow-sm">
        <TariffEditor value={draft} onChange={setDraft} />
      </div>

      <Button size="lg" className="text-base" onClick={save} disabled={saving}>
        {saving ? t("wizard.saving") : t("tariff.save")}
      </Button>
    </div>
  );
}
