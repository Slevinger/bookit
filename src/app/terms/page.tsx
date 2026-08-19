import Link from "next/link";
import type { Metadata } from "next";

const APP_NAME = "BookIt";
const SUPPORT_EMAIL = "shir.levinger@gmail.com";
const LAST_UPDATED = "August 19, 2026";

export const metadata: Metadata = {
  title: "Terms of Service — BookIt",
  description: "The terms for using BookIt.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-5 py-12">
      <article className="space-y-6 text-sm leading-relaxed text-foreground">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold">{APP_NAME} Terms of Service</h1>
          <p className="text-muted-foreground">Last updated: {LAST_UPDATED}</p>
        </header>

        <Section title="Acceptance of terms">
          <p>
            By accessing or using {APP_NAME}, you agree to these Terms of Service. If you
            do not agree, do not use the service.
          </p>
        </Section>

        <Section title="The service">
          <p>
            {APP_NAME} helps small accommodation providers manage rooms, bookings, and
            availability, and can synchronize your bookings to a dedicated Google
            Calendar. Features may change over time.
          </p>
        </Section>

        <Section title="Your responsibilities">
          <ul className="list-disc space-y-1 ps-6">
            <li>You are responsible for the accuracy of the data you enter.</li>
            <li>You must keep your Google account secure.</li>
            <li>You must not misuse the service or attempt to disrupt it.</li>
          </ul>
        </Section>

        <Section title="Disclaimer and liability">
          <p>
            {APP_NAME} is provided &quot;as is&quot; without warranties of any kind. To
            the maximum extent permitted by law, {APP_NAME} is not liable for any
            indirect or consequential damages arising from your use of the service.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about these terms? Email{" "}
            <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </Section>

        <footer className="border-t pt-6 text-muted-foreground">
          <Link className="underline" href="/privacy">
            Privacy Policy
          </Link>
          <span className="px-2">·</span>
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
