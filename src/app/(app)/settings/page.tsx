import { getCalendarStatusAction } from "@/lib/google/actions";
import { GoogleCalendarCard } from "@/components/settings/google-calendar-card";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const status = await getCalendarStatusAction();
  return (
    <div className="mx-auto w-full max-w-2xl">
      <GoogleCalendarCard status={status} />
    </div>
  );
}
