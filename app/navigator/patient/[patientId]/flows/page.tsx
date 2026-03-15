"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArulHealthText } from "@/components/ArulHealthText";

type Flow = {
  id: string;
  patientId: string;
  name: string;
  schedule: "morning" | "evening" | "daily";
  instructions: string;
  enabled: boolean;
  createdAt: string;
};

const SCHEDULE_LABELS: Record<Flow["schedule"], string> = {
  morning: "Every morning (8am)",
  evening: "Every evening (6pm)",
  daily: "Daily (9am)",
};

export default function PatientFlowsPage() {
  const params = useParams();
  const patientId = params.patientId as string;
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [schedule, setSchedule] = useState<Flow["schedule"]>("daily");
  const [instructions, setInstructions] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSchedule, setEditSchedule] = useState<Flow["schedule"]>("daily");
  const [editInstructions, setEditInstructions] = useState("");

  const load = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/patients/${patientId}/flows`);
      if (res.ok) {
        const data = await res.json();
        setFlows(data);
      }
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    load();
  }, [load]);

  const createFlow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !name.trim() || !instructions.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/patients/${patientId}/flows`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), schedule, instructions: instructions.trim() }),
      });
      if (res.ok) {
        setName("");
        setInstructions("");
        setShowForm(false);
        await load();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (f: Flow) => {
    setEditingId(f.id);
    setEditName(f.name);
    setEditSchedule(f.schedule);
    setEditInstructions(f.instructions);
  };

  const saveEdit = async (flowId: string) => {
    if (!editingId || editingId !== flowId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/patients/${patientId}/flows/${flowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          schedule: editSchedule,
          instructions: editInstructions.trim(),
        }),
      });
      if (res.ok) {
        setEditingId(null);
        await load();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const cancelEdit = () => setEditingId(null);

  const deleteFlow = async (flowId: string) => {
    if (!confirm("Delete this flow?")) return;
    try {
      const res = await fetch(`/api/patients/${patientId}/flows/${flowId}`, {
        method: "DELETE",
      });
      if (res.ok) await load();
    } catch {
      // ignore
    }
  };

  const toggleEnabled = async (f: Flow) => {
    try {
      await fetch(`/api/patients/${patientId}/flows/${f.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !f.enabled }),
      });
      await load();
    } catch {
      // ignore
    }
  };

  return (
    <main className="min-h-screen max-w-3xl mx-auto px-4 py-8">
      <header className="mb-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <ArulHealthText href="/navigator" size="md" />
          <Link
            href="/navigator"
            className="text-sm text-arul-purple hover:underline font-medium"
          >
            ← Dashboard
          </Link>
        </div>
        <h1 className="text-xl font-semibold text-arul-forest">Flows</h1>
        <p className="text-stone-600 mt-1 text-sm">
          Recurring actions for this patient (e.g. check calendar, email daily summary). Runs automatically on schedule.
        </p>
      </header>

      <div className="mb-6">
        {!showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-arul-purple px-4 py-2 text-sm font-medium text-white hover:bg-arul-purple-dark transition-colors"
          >
            Create flow
          </button>
        ) : (
          <form onSubmit={createFlow} className="rounded-xl border border-arul-purple/20 bg-white p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Daily medical summary"
                className="w-full p-2 border border-arul-purple/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-arul-purple/50"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Schedule</label>
              <select
                value={schedule}
                onChange={(e) => setSchedule(e.target.value as Flow["schedule"])}
                className="w-full p-2 border border-arul-purple/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-arul-purple/50"
              >
                <option value="morning">Every morning (8am)</option>
                <option value="evening">Every evening (6pm)</option>
                <option value="daily">Daily (9am)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Instructions</label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g. Check the patient's calendar for today. Find any doctor or medical appointments. Send the patient an email summarizing what's coming up and where each event is located."
                rows={4}
                className="w-full p-2 border border-arul-purple/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-arul-purple/50 resize-y"
                required
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-arul-purple px-4 py-2 text-sm font-medium text-white hover:bg-arul-purple-dark disabled:opacity-50"
              >
                {submitting ? "Creating…" : "Create"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-stone-300 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {loading ? (
        <p className="text-stone-500">Loading flows…</p>
      ) : flows.length === 0 ? (
        <p className="text-stone-500">No flows yet. Create one to run repeated actions (e.g. check calendar, email the patient) on a schedule.</p>
      ) : (
        <ul className="space-y-4">
          {flows.map((f) => (
            <li
              key={f.id}
              className="rounded-xl border border-arul-purple/20 bg-white p-4 shadow-sm"
            >
              {editingId === f.id ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Flow name"
                    className="w-full p-2 border border-arul-purple/30 rounded-lg text-sm"
                  />
                  <select
                    value={editSchedule}
                    onChange={(e) => setEditSchedule(e.target.value as Flow["schedule"])}
                    className="w-full p-2 border border-arul-purple/30 rounded-lg text-sm"
                  >
                    <option value="morning">Every morning (8am)</option>
                    <option value="evening">Every evening (6pm)</option>
                    <option value="daily">Daily (9am)</option>
                  </select>
                  <textarea
                    value={editInstructions}
                    onChange={(e) => setEditInstructions(e.target.value)}
                    rows={3}
                    className="w-full p-2 border border-arul-purple/30 rounded-lg text-sm resize-y"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => saveEdit(f.id)}
                      disabled={submitting}
                      className="rounded-lg bg-arul-purple px-3 py-1.5 text-sm text-white hover:bg-arul-purple-dark disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-medium text-arul-forest">{f.name}</span>
                      <span className="ml-2 text-xs text-stone-500">
                        {SCHEDULE_LABELS[f.schedule]}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleEnabled(f)}
                        className={`text-xs px-2 py-1 rounded ${f.enabled ? "bg-green-100 text-green-800" : "bg-stone-100 text-stone-500"}`}
                      >
                        {f.enabled ? "On" : "Off"}
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(f)}
                        className="text-xs text-arul-purple hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteFlow(f.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-stone-600 whitespace-pre-wrap">{f.instructions}</p>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-8 text-xs text-stone-500">
        Flows run automatically when the cron job is triggered at the scheduled hour (e.g. 8am for morning). Set CRON_SECRET and call GET /api/cron/run-flows with Authorization: Bearer &lt;secret&gt; on a schedule (e.g. Vercel Cron).
      </p>
    </main>
  );
}
