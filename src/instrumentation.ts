// When running on your own machine or server (not serverless), set AUTOPILOT_TIMER=1
// to run the autopilot every minute without an external cron.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.AUTOPILOT_TIMER !== "1") return;
  const { runAutopilot } = await import("./lib/autopilot");
  const tick = async () => {
    try {
      const results = await runAutopilot();
      for (const r of results) console.log(`[autopilot] ${r.slot} ${r.status}: ${r.detail.slice(0, 80)}`);
    } catch (err) {
      console.error("[autopilot] run failed", err);
    }
  };
  setInterval(tick, 60_000);
  console.log("[autopilot] local timer started (every 60s)");
}
