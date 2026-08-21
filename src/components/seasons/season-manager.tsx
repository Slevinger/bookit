"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarRange, Plus, RefreshCw, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { importSeasonYearAction, saveSeasonRangesAction } from "@/lib/actions/seasons";
import type { HighSeasonRange, SeasonConfig } from "@/lib/domain/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";

interface RangeDraft extends HighSeasonRange {
  key: number;
}

export function SeasonManager({ config, years }: { config: SeasonConfig; years: number[] }) {
  const { t, dateLocale } = useI18n();
  const router = useRouter();
  const [ranges, setRanges] = useState<RangeDraft[]>(
    config.manualRanges.map((r, i) => ({ ...r, key: i })),
  );
  const [importing, setImporting] = useState<number | null>(null);
  const [savingRanges, setSavingRanges] = useState(false);

  const holidaysByYear = new Map<number, SeasonConfig["holidays"]>();
  for (const h of config.holidays) {
    const year = Number(h.date.slice(0, 4));
    holidaysByYear.set(year, [...(holidaysByYear.get(year) ?? []), h]);
  }

  async function importYear(year: number) {
    setImporting(year);
    const result = await importSeasonYearAction(year);
    setImporting(null);
    if (result.ok) {
      toast.success(t("seasons.imported", { year }));
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  function addRange() {
    setRanges((prev) => [
      ...prev,
      { key: prev.reduce((max, r) => Math.max(max, r.key), -1) + 1, from: "", to: "", label: "" },
    ]);
  }

  function updateRange(key: number, patch: Partial<HighSeasonRange>) {
    setRanges((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function removeRange(key: number) {
    setRanges((prev) => prev.filter((r) => r.key !== key));
  }

  async function saveRanges() {
    const clean = ranges
      .filter((r) => r.from && r.to && r.from <= r.to)
      .map(({ from, to, label }) => ({ from, to, label: label?.trim() || undefined }));
    setSavingRanges(true);
    const result = await saveSeasonRangesAction(clean);
    setSavingRanges(false);
    if (result.ok) {
      toast.success(t("seasons.rangesSaved"));
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-6">
      <div className="grid gap-1">
        <h1 className="text-2xl font-bold">{t("seasons.title")}</h1>
        <p className="text-base text-muted-foreground">{t("seasons.description")}</p>
      </div>

      {/* Holiday import per year */}
      <section className="grid gap-3 rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-primary" />
          <h2 className="text-lg font-semibold">{t("seasons.holidays")}</h2>
        </div>
        <p className="text-sm text-muted-foreground">{t("seasons.holidaysHint")}</p>
        <div className="grid gap-4">
          {years.map((year) => {
            const holidays = holidaysByYear.get(year) ?? [];
            return (
              <div key={year} className="grid gap-2 rounded-xl border p-4">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold">{year}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={importing !== null}
                    onClick={() => importYear(year)}
                  >
                    <RefreshCw className={importing === year ? "size-4 animate-spin" : "size-4"} />
                    {holidays.length ? t("seasons.refresh") : t("seasons.import")}
                  </Button>
                </div>
                {holidays.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("seasons.noHolidays")}</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {holidays.map((h) => (
                      <span
                        key={h.date}
                        className="rounded-md bg-primary/10 px-2 py-1 text-xs text-primary"
                        title={new Date(`${h.date}T00:00:00`).toLocaleDateString(dateLocale)}
                      >
                        {h.title}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Manual ranges */}
      <section className="grid gap-3 rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <CalendarRange className="size-5 text-primary" />
          <h2 className="text-lg font-semibold">{t("seasons.manualRanges")}</h2>
        </div>
        <p className="text-sm text-muted-foreground">{t("seasons.manualRangesHint")}</p>

        <div className="grid gap-3">
          {ranges.map((range) => (
            <div key={range.key} className="grid gap-2 rounded-xl border p-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">{t("seasons.from")}</Label>
                  <Input
                    type="date"
                    className="h-12 text-base"
                    value={range.from}
                    max={range.to || undefined}
                    onChange={(e) => updateRange(range.key, { from: e.target.value })}
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">{t("seasons.to")}</Label>
                  <Input
                    type="date"
                    className="h-12 text-base"
                    value={range.to}
                    min={range.from || undefined}
                    onChange={(e) => updateRange(range.key, { to: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-end gap-2">
                <div className="grid flex-1 gap-1">
                  <Label className="text-xs text-muted-foreground">{t("seasons.label")}</Label>
                  <Input
                    className="h-12 text-base"
                    placeholder={t("seasons.labelPlaceholder")}
                    value={range.label ?? ""}
                    onChange={(e) => updateRange(range.key, { label: e.target.value })}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  aria-label={t("seasons.removeRange")}
                  onClick={() => removeRange(range.key)}
                >
                  <X className="size-5" />
                </Button>
              </div>
              {range.from && range.to && range.from > range.to && (
                <p className="text-xs text-destructive">{t("seasons.rangeError")}</p>
              )}
            </div>
          ))}
          <Button type="button" variant="ghost" size="lg" className="justify-start text-base" onClick={addRange}>
            <Plus className="size-5" /> {t("seasons.addRange")}
          </Button>
        </div>

        <Button size="lg" className="text-base" onClick={saveRanges} disabled={savingRanges}>
          {savingRanges ? t("wizard.saving") : t("seasons.saveRanges")}
        </Button>
      </section>
    </div>
  );
}
