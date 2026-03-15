import Link from "next/link";
import { ArulHealthText } from "@/components/ArulHealthText";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col bg-stone-50">
      <header className="px-4 py-6 sm:px-6 sm:py-8 border-b border-stone-200/80">
        <div className="max-w-4xl mx-auto">
          <ArulHealthText href="/" size="lg" />
        </div>
      </header>
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-16 sm:py-24">
        <div className="text-center max-w-2xl">
          <h1 className="text-2xl sm:text-3xl font-semibold text-arul-forest tracking-tight">
            The navigator beside every patient.
          </h1>
          <p className="text-stone-600 mt-4 text-base sm:text-lg leading-relaxed">
            Built to level the playing field between patients and the system around them.
            For the in-between moments: the questions, the chaos, the 2am worries.
          </p>
          <p className="text-stone-500 mt-6 text-sm">
            Care teams: connect patient tools and chat on their behalf to help with
            appointments, email, and reminders.
          </p>
          <Link
            href="/navigator"
            className="mt-10 inline-block rounded-lg bg-arul-purple px-6 py-3.5 font-medium text-white hover:bg-arul-purple-dark transition-colors focus:outline-none focus:ring-2 focus:ring-arul-purple/50 focus:ring-offset-2"
          >
            Open Navigator Dashboard
          </Link>
        </div>
      </section>

      <footer className="px-4 py-6 border-t border-stone-200/80 text-center text-sm text-stone-500">
        © {new Date().getFullYear()} Arul Health. Built with care.
      </footer>
    </main>
  );
}
