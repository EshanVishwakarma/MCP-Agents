"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArulLogo } from "@/components/ArulLogo";

type Connection = { slug: string; name: string; connected: boolean };
type Patient = {
  id: string;
  displayName?: string;
  createdAt: string;
  connections?: Connection[];
};

export default function NavigatorDashboard() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [addName, setAddName] = useState("");
  const [adding, setAdding] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/patients");
      if (res.ok) {
        const data = await res.json();
        setPatients(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adding) return;
    setAdding(true);
    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: addName || undefined }),
      });
      if (res.ok) {
        setAddName("");
        await load();
      }
    } finally {
      setAdding(false);
    }
  };

  const copyLink = (patient: Patient) => {
    const base =
      typeof window !== "undefined"
        ? window.location.origin
        : "";
    const link = `${base}/connect/${patient.id}`;
    navigator.clipboard.writeText(link);
    setCopiedId(patient.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <main className="min-h-screen max-w-3xl mx-auto px-4 py-8">
      <header className="mb-8">
        <Link href="/" className="inline-block mb-6">
          <ArulLogo height={32} />
        </Link>
        <h1 className="text-xl font-semibold text-arul-forest">Navigator Dashboard</h1>
        <p className="text-stone-600 mt-1 text-sm">
          Manage patients and chat on their behalf using their connected accounts.
        </p>
      </header>

      <form onSubmit={addPatient} className="mb-8 flex gap-2">
        <input
          type="text"
          value={addName}
          onChange={(e) => setAddName(e.target.value)}
          placeholder="Patient name (optional)"
          className="flex-1 p-3 border border-arul-teal/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-arul-teal/50"
        />
        <button
          type="submit"
          disabled={adding}
          className="px-5 py-3 bg-arul-purple text-white font-medium rounded-lg hover:bg-arul-purple-dark transition-colors disabled:opacity-50"
        >
          Add patient
        </button>
      </form>

      {loading && patients.length === 0 ? (
        <p className="text-stone-500">Loading patients…</p>
      ) : patients.length === 0 ? (
        <p className="text-stone-500">No patients yet. Add one above to get a connect link.</p>
      ) : (
        <ul className="space-y-4">
          {patients.map((p) => (
            <li
              key={p.id}
              className="rounded-xl border border-arul-purple/20 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-medium text-arul-forest">
                    {p.displayName || "Patient"}
                  </span>
                  <span className="text-xs text-stone-400 ml-2 font-mono">
                    {p.id.slice(0, 8)}…
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => copyLink(p)}
                    className="rounded-lg border border-arul-purple/40 px-3 py-1.5 text-sm text-arul-purple hover:bg-arul-purple/10 transition-colors"
                  >
                    {copiedId === p.id ? "Copied" : "Copy link"}
                  </button>
                  <Link
                    href={`/navigator/chat/${p.id}`}
                    className="rounded-lg bg-arul-purple px-4 py-2 text-sm font-medium text-white hover:bg-arul-purple-dark transition-colors"
                  >
                    Chat
                  </Link>
                </div>
              </div>
              {Array.isArray(p.connections) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {p.connections
                    .filter((c) => c.connected)
                    .map((c) => (
                      <span
                        key={c.slug}
                        className="rounded-full bg-arul-mint/50 px-2 py-0.5 text-xs text-arul-navy"
                      >
                        {c.name}
                      </span>
                    ))}
                  {p.connections.filter((c) => c.connected).length === 0 && (
                    <span className="text-xs text-stone-500">No accounts connected</span>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
