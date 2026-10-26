import "server-only";

export const env = {
  appUrl: (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  xClientId: process.env.X_CLIENT_ID ?? "",
  xClientSecret: process.env.X_CLIENT_SECRET ?? "",
  geminiKey: process.env.GEMINI_API_KEY ?? "",
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
  encryptionKey: process.env.ENCRYPTION_KEY ?? "",
  cronSecret: process.env.CRON_SECRET ?? "",
  isProd: process.env.NODE_ENV === "production",
};

// Without X credentials the app runs in demo mode: "Sign in with X" becomes a
// local demo login and posts are recorded instead of sent to X.
export const demoMode = !env.xClientId;
export const fakeAi = !env.geminiKey;
