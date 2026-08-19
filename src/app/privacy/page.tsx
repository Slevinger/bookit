import Link from "next/link";
import type { Metadata } from "next";

// Update these to your real details before submitting for verification.
const APP_NAME = "BookIt";
const SUPPORT_EMAIL = "shir.levinger@gmail.com";
const LAST_UPDATED = "August 19, 2026";

export const metadata: Metadata = {
  title: "Privacy Policy — BookIt",
  description: "How BookIt collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-5 py-12">
      <article className="space-y-6 text-sm leading-relaxed text-foreground">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold">{APP_NAME} Privacy Policy</h1>
          <p className="text-muted-foreground">Last updated: {LAST_UPDATED}</p>
        </header>

        <section className="space-y-2">
          <p>
            {APP_NAME} is a booking management tool for small accommodation providers
            (bed &amp; breakfasts, guesthouses, and vacation rentals). This policy
            explains what information {APP_NAME} accesses, how it is used, and the
            choices you have.
          </p>
        </section>

        <Section title="Information we access">
          <p>When you sign in with Google, {APP_NAME} accesses:</p>
          <ul className="list-disc space-y-1 ps-6">
            <li>
              <strong>Your Google account identifier and email address</strong> — used
              to identify your account and keep your data separate from other users.
            </li>
            <li>
              <strong>Google Calendar access</strong> (the{" "}
              <code>https://www.googleapis.com/auth/calendar</code> scope) — used only
              to create a dedicated calendar named &quot;{APP_NAME} Bookings&quot; in
              your account and to add, update, or remove events that correspond to your
              bookings.
            </li>
          </ul>
        </Section>

        <Section title="How we use your information">
          <ul className="list-disc space-y-1 ps-6">
            <li>To authenticate you and secure access to your own data.</li>
            <li>
              To synchronize the bookings you create in {APP_NAME} to your Google
              Calendar, one way, from {APP_NAME} to Google Calendar.
            </li>
          </ul>
          <p>
            {APP_NAME} does not read, organize, or use events from your existing
            calendars beyond the dedicated &quot;{APP_NAME} Bookings&quot; calendar it
            creates.
          </p>
        </Section>

        <Section title="How we store your information">
          <p>
            Your bookings, rooms, and account record are stored in Google Cloud
            Firestore. To keep your calendar in sync, {APP_NAME} stores a Google OAuth
            refresh token, which is used solely to obtain short-lived access tokens for
            the Calendar API. We do not store your Google password.
          </p>
        </Section>

        <Section title="How we share your information">
          <p>
            We do not sell, rent, or share your personal information or Google user data
            with third parties. Data is processed only to provide the features described
            above.
          </p>
        </Section>

        <Section title="Limited Use disclosure">
          <p>
            {APP_NAME}&apos;s use and transfer to any other app of information received
            from Google APIs will adhere to the{" "}
            <a
              className="underline"
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noreferrer"
            >
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements.
          </p>
        </Section>

        <Section title="Your choices and data deletion">
          <ul className="list-disc space-y-1 ps-6">
            <li>
              You can revoke {APP_NAME}&apos;s access at any time from your{" "}
              <a
                className="underline"
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noreferrer"
              >
                Google Account permissions
              </a>{" "}
              page.
            </li>
            <li>
              You can delete the &quot;{APP_NAME} Bookings&quot; calendar directly in
              Google Calendar.
            </li>
            <li>
              To request deletion of your {APP_NAME} account data, contact us at the
              email below.
            </li>
          </ul>
        </Section>

        <Section title="Contact">
          <p>
            Questions about this policy? Email{" "}
            <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </Section>

        <footer className="border-t pt-6">
          <Link className="underline" href="/login">
            Back to sign in
          </Link>
        </footer>
      </article>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}
