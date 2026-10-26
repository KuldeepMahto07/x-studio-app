import Link from "next/link";
import { oneClickMode } from "@/lib/env";
import { PLANS } from "@/lib/types";
import { AppIcon } from "@/components/icons";
import { LandingFeatures } from "@/components/landing-features";

export default function Landing() {
  return (
    <div className="mx-auto w-full max-w-5xl px-5">
      <nav className="flex items-center justify-between py-5">
        <span className="flex items-center gap-2.5">
          <AppIcon size={30} />
          <span className="text-[20px] font-bold tracking-tight">X Studio</span>
        </span>
        <Link href="/login" className="btn btn-gray btn-sm">Sign In</Link>
      </nav>

      <header className="grid items-center gap-12 py-12 md:grid-cols-[1.1fr_1fr] md:py-20">
        <div className="animate-rise text-center md:text-left">
          <h1 className="text-[44px] font-bold leading-[1.05] tracking-tight sm:text-[56px]">
            Post every day on X.<br />
            <span className="bg-gradient-to-r from-[#0a84ff] to-[#bf5af2] bg-clip-text text-transparent">Without writing every day.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-md text-[19px] text-muted md:mx-0">
            Tell X Studio your niche once. It writes posts in your voice and has them ready on your schedule.
          </p>

          <div id="start" className="mx-auto mt-8 max-w-sm md:mx-0">
            <div className="flex flex-col gap-3 sm:flex-row md:justify-start">
              <Link href="/signup" className="btn btn-filled flex-1">Get Started, It&apos;s Free</Link>
              <Link href="/login" className="btn btn-gray flex-1">Sign In</Link>
            </div>
            <p className="mt-3 text-[13px] text-muted">
              {oneClickMode ? "No X API needed. Posts open in X with one tap." : "Connect your X account after signing up."}
            </p>
          </div>
        </div>

        {/* Phone mockup with a live-looking notification */}
        <div className="relative mx-auto w-[290px] animate-rise" style={{ animationDelay: "120ms" }}>
          <div className="absolute -inset-10 -z-10 rounded-full bg-gradient-to-tr from-[#0a84ff]/30 via-[#bf5af2]/20 to-transparent blur-3xl" />
          <div className="rounded-[48px] bg-[#1c1c1e] p-3 shadow-2xl ring-1 ring-white/10">
            <div className="relative h-[560px] overflow-hidden rounded-[38px] bg-gradient-to-b from-[#1e3a8a] via-[#6d28d9] to-[#0f172a] px-3 pt-14">
              <div className="absolute left-1/2 top-3 h-7 w-24 -translate-x-1/2 rounded-full bg-black" />
              <p className="text-center text-[64px] font-light leading-none text-white/90">9:00</p>
              <p className="mb-8 text-center text-[15px] text-white/70">Monday, 26 October</p>
              <div className="animate-float">
                <div className="rounded-[20px] bg-white/75 p-3 text-black shadow-lg backdrop-blur-xl">
                  <div className="mb-1 flex items-center gap-2 text-[12px] text-black/50">
                    <AppIcon size={18} />
                    <span className="font-semibold uppercase">X Studio</span>
                    <span className="ml-auto">now</span>
                  </div>
                  <p className="text-[14px] font-semibold">Time to post</p>
                  <p className="text-[14px] leading-snug">3 free AI tools saving me $50+/mo: Continue.dev, DeepSeek V3, FLUX.1…</p>
                </div>
              </div>
              <div className="mt-2 rounded-[20px] bg-white/40 p-3 opacity-70 backdrop-blur-xl">
                <div className="h-2.5 w-24 rounded bg-black/20" />
                <div className="mt-2 h-2.5 w-44 rounded bg-black/10" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <LandingFeatures />

      <section className="py-10">
        <h2 className="mb-6 text-center text-[28px] font-bold tracking-tight">Simple pricing</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {Object.entries(PLANS).map(([key, p]) => (
            <div key={key} className={`card text-center ${key === "pro" ? "ring-2 ring-accent" : ""}`}>
              <h3 className="font-semibold">{p.label}</h3>
              <div className="my-1 text-[40px] font-bold tracking-tight">{p.price}</div>
              <p className="text-[15px] text-muted">{p.postsPerDay} post{p.postsPerDay > 1 ? "s" : ""} a day · {p.postsPerMonth} a month</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="py-10 text-center text-[13px] text-muted">© 2026 X Studio · Not affiliated with X Corp.</footer>
    </div>
  );
}
