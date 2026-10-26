import Link from "next/link";
import { demoLogin } from "./actions";
import { demoMode } from "@/lib/env";
import { PLANS } from "@/lib/types";

const steps = [
  ["Set your niche", "Topics, audience and voice. Takes two minutes."],
  ["Approve or skip", "Drafts land in a queue. Edit, reorder, or let it run."],
  ["It posts on autopilot", "At your chosen times, every day, even when you're busy."],
];

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-5xl px-6">
      <nav className="flex items-center justify-between py-6">
        <div className="text-lg font-extrabold">
          X <span className="text-accent">Studio</span>
        </div>
        <a href="#signin" className="text-sm text-muted hover:text-ink">Sign in →</a>
      </nav>

      <header className="py-16 text-center">
        <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
          Post every day on X without writing every day.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted">
          Tell X Studio your niche once. It writes posts in your voice and publishes them on your schedule.
          Review the queue whenever you want, or don&apos;t.
        </p>

        <div id="signin" className="mx-auto mt-9 max-w-md">
          {demoMode ? (
            <form action={demoLogin} className="card text-left">
              <p className="mb-3 text-sm text-muted">
                <span className="tag mr-1.5 border-warn/40 text-warn">Demo mode</span>
                No X app keys yet, so sign-in is simulated and posts aren&apos;t sent to X.
              </p>
              <label className="label" htmlFor="handle">Pick a demo handle</label>
              <div className="flex gap-2">
                <input id="handle" name="handle" className="field" placeholder="@your_handle" />
                <button className="btn btn-primary shrink-0">Enter demo</button>
              </div>
            </form>
          ) : (
            <Link href="/api/auth/x/start" prefetch={false} className="btn btn-primary px-6 py-3 text-base">
              Sign in with X
            </Link>
          )}
        </div>
      </header>

      <section className="grid gap-4 border-t border-line py-14 sm:grid-cols-3">
        {steps.map(([title, body], i) => (
          <div key={title} className="card">
            <div className="mb-2 text-sm font-extrabold text-accent">0{i + 1}</div>
            <h3 className="font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-muted">{body}</p>
          </div>
        ))}
      </section>

      <section className="border-t border-line py-14">
        <h2 className="mb-8 text-center text-3xl font-bold tracking-tight">Simple pricing</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {Object.entries(PLANS).map(([key, p]) => (
            <div key={key} className={`card text-center ${key === "pro" ? "border-accent" : ""}`}>
              <h3 className="font-semibold">{p.label}</h3>
              <div className="my-2 text-4xl font-extrabold tracking-tight">{p.price}</div>
              <ul className="space-y-1 text-left text-sm text-muted">
                <li>✓ Up to {p.postsPerDay} post{p.postsPerDay > 1 ? "s" : ""} a day</li>
                <li>✓ {p.postsPerMonth} posts a month</li>
                <li>✓ AI drafts and approval queue</li>
              </ul>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-line py-10 text-center text-sm text-muted">
        © 2026 X Studio · Not affiliated with X Corp.
      </footer>
    </div>
  );
}
