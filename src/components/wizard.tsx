"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface WizardStep {
  id: string;
  title: string;
  content: React.ReactNode;
  /** Return an error message to block moving forward, or null when valid. */
  validate?: () => string | null;
}

export interface WizardProps {
  steps: WizardStep[];
  onFinish: () => void | Promise<void>;
  finishLabel?: string;
  submitting?: boolean;
}

/**
 * One question per screen, big buttons, clear progress — the interaction
 * pattern used by every flow in the app (per product decision: always wizards).
 */
export function Wizard({ steps, onFinish, finishLabel, submitting = false }: WizardProps) {
  const { t } = useI18n();
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const step = steps[index];
  const isLast = index === steps.length - 1;

  function next() {
    const message = step.validate?.() ?? null;
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    if (isLast) {
      void onFinish();
    } else {
      setIndex(index + 1);
    }
  }

  function back() {
    setError(null);
    setIndex(Math.max(0, index - 1));
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      {/* Progress */}
      <div className="grid gap-2">
        <div className="flex gap-1.5">
          {steps.map((s, i) => (
            <span
              key={s.id}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                i <= index ? "bg-primary" : "bg-muted",
              )}
            />
          ))}
        </div>
        <p className="text-sm font-medium text-muted-foreground">
          {t("wizard.step", { current: index + 1, total: steps.length })}
        </p>
        <h2 className="text-xl font-bold">{step.title}</h2>
      </div>

      {/* Step content */}
      <div className="min-h-0 flex-1 overflow-y-auto">{step.content}</div>

      {error && (
        <p role="alert" className="text-base font-medium text-destructive">
          {error}
        </p>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        {index > 0 && (
          <Button type="button" variant="outline" size="lg" className="h-13 flex-1 text-base" onClick={back}>
            <ArrowLeft className="size-5 rtl:-scale-x-100" />
            {t("wizard.back")}
          </Button>
        )}
        <Button
          type="button"
          size="lg"
          className="h-13 flex-[2] text-base"
          disabled={submitting}
          onClick={next}
        >
          {isLast ? (
            <>
              <Check className="size-5" />
              {submitting ? t("wizard.saving") : (finishLabel ?? t("wizard.save"))}
            </>
          ) : (
            <>
              {t("wizard.next")}
              <ArrowRight className="size-5 rtl:-scale-x-100" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
