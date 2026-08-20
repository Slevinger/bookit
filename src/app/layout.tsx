import type { Metadata, Viewport } from "next";
import { Geist, Noto_Sans_Hebrew } from "next/font/google";
import { cookies } from "next/headers";
import { Toaster } from "@/components/ui/sonner";
// Constants must come from the server-safe dictionaries module: importing them
// through the "use client" i18n barrel yields client-reference proxies here.
import { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from "@/lib/i18n/dictionaries";
import { LocaleProvider } from "@/lib/i18n";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const hebrew = Noto_Sans_Hebrew({ subsets: ["hebrew"], variable: "--font-hebrew" });

export const metadata: Metadata = {
  title: "BookIt — B&B Manager",
  description: "Room listings, bookings and availability for your B&B",
  icons: { icon: "/logo.png", apple: "/logo.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale: Locale = cookieLocale === "en" ? "en" : DEFAULT_LOCALE;

  return (
    <html lang={locale} dir={locale === "he" ? "rtl" : "ltr"} className="dark">
      <body
        className={`${geist.variable} ${hebrew.variable} min-h-dvh bg-background font-sans antialiased`}
        style={{ fontFamily: "var(--font-geist), var(--font-hebrew), sans-serif" }}
      >
        <LocaleProvider locale={locale}>
          {children}
          <Toaster position="top-center" richColors />
        </LocaleProvider>
      </body>
    </html>
  );
}
