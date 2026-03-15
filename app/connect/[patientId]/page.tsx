"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArulLogo } from "@/components/ArulLogo";

const RECOMMENDED_SLUGS = [
  "gmail",
  "googlecalendar",
  "google_calendar",
  "slack",
  "notion",
];

type Toolkit = { slug: string; name: string; connected: boolean };

export default function ConnectPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const patientId = params.patientId as string;
  const justConnected = searchParams.get("connected") === "1";
  const error = searchParams.get("error");

  const [data, setData] = useState<{ toolkits: Toolkit[] } | null>(null);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    if (!patientId) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/connect/${patientId}/status`);
        if (!res.ok) throw new Error("Failed to load");
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setFetchError(true);
      }
    };
    load();
    const t = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [patientId]);

  const toolkits = (data?.toolkits ?? []).filter((t) =>
    RECOMMENDED_SLUGS.some(
      (s) => t.slug.toLowerCase().replace(/_/g, "") === s.toLowerCase().replace(/_/g, "")
    )
  );
  const displayList = toolkits.length > 0 ? toolkits : (data?.toolkits ?? []).slice(0, 8);

  return (
    <main className="min-h-screen flex flex-col max-w-2xl mx-auto px-4 py-6 sm:py-8 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      <header className="mb-6 sm:mb-8">
        <Link href="/" className="inline-block mb-6">
          <ArulLogo height={28} />
        </Link>
        <h1 className="text-xl sm:text-2xl font-semibold text-arul-forest leading-tight">
          Connect your accounts
        </h1>
        <p className="text-stone-600 mt-1 text-base sm:text-sm">
          Connect your accounts so your care team can help you with appointments, email, and reminders.
        </p>
      </header>

      {justConnected && (
        <div className="mb-4 sm:mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Account connected successfully.
        </div>
      )}
      {error === "connection_failed" && (
        <div className="mb-4 sm:mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Connection failed. Please try again.
        </div>
      )}

      {fetchError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 mb-4">
          Failed to load connection status.
        </div>
      )}

      <ul className="space-y-3 sm:space-y-3">
        {displayList.map((t) => (
          <li
            key={t.slug}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-arul-purple/20 bg-white px-4 py-3"
          >
            <span className="font-medium text-arul-forest text-base pt-0.5 sm:pt-0">
              {t.name}
            </span>
            {t.connected ? (
              <span className="text-sm text-green-600 font-medium sm:self-center">
                Connected
              </span>
            ) : (
              <a
                href={`/api/connect/${patientId}/authorize?toolkit=${encodeURIComponent(t.slug)}`}
                className="rounded-xl bg-arul-purple px-5 py-3.5 text-base font-medium text-white hover:bg-arul-purple-dark active:opacity-90 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
              >
                Connect
              </a>
            )}
          </li>
        ))}
      </ul>

      {data && displayList.length === 0 && (
        <p className="text-stone-500 text-sm mt-4">
          No recommended integrations available. Check back later.
        </p>
      )}
    </main>
  );
}
