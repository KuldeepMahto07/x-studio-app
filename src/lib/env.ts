import "server-only";

export const env = {
  appUrl: (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  xClientId: process.env.X_CLIENT_ID ?? "",
  xClientSecret: process.env.X_CLIENT_SECRET ?? "",
  geminiKey: process.env.GEMINI_API_KEY ?? "",
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-3.5-flash",
  encryptionKey: process.env.ENCRYPTION_KEY ?? "",
  cronSecret: process.env.CRON_SECRET ?? "",
  isProd: process.env.NODE_ENV === "production",
};

// Without X API credentials the app runs in one-click mode (free): accounts are local,
// and at each scheduled time a post is made ready for the user to publish with one click
// through X's share link. With credentials, autopilot posts through the X API.
export const oneClickMode = !env.xClientId;
export const fakeAi = !env.geminiKey;
