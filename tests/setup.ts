import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// Each test file gets its own throwaway database; real data in ./data is never touched.
process.env.DATABASE_PATH = path.join(mkdtempSync(path.join(tmpdir(), "xstudio-test-")), "test.db");

// Run in free one-click mode with placeholder AI and local test billing, whatever .env.local says.
for (const key of [
  "X_CLIENT_ID", "X_CLIENT_SECRET", "GEMINI_API_KEY", "RESEND_API_KEY", "MAIL_FROM",
  "LEMONSQUEEZY_API_KEY", "LEMONSQUEEZY_STORE_ID", "LEMONSQUEEZY_WEBHOOK_SECRET",
  "LEMONSQUEEZY_VARIANT_PRO", "LEMONSQUEEZY_VARIANT_CREATOR",
]) delete process.env[key];
