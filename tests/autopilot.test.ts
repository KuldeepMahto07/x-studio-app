import { describe, expect, it } from "vitest";
import { createAccount } from "@/lib/accounts";
import { localNow, postNow, runAutopilot } from "@/lib/autopilot";
import { get, run } from "@/lib/db";
import {
  getSlots, listPosts, listReady, markPosted, movePost, queuePost, saveNiche, saveSchedule, setAutopilot, unreadyPost, validateText,
} from "@/lib/posts";
import type { User } from "@/lib/types";

const NICHE = { niche: "AI tools", audience: "developers", voice: "practical", topics: ["a", "b", "c"], formats: ["tip"] };

async function newUser(plan = "free") {
  const res = await createAccount({ email: `a${Math.random().toString(36).slice(2, 8)}@example.com`, password: "password123", handle: "pilot" });
  if (!res.ok) throw new Error(res.error);
  run("UPDATE users SET plan = ? WHERE id = ?", plan, res.userId);
  saveNiche(res.userId, NICHE);
  return res.userId;
}
const user = (id: string) => get<User>("SELECT * FROM users WHERE id = ?", id)!;
const hhmm = (d: Date) => `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;

describe("queue", () => {
  it("validates post length", () => {
    expect(validateText("")).toMatch(/empty/);
    expect(validateText("x".repeat(281))).toMatch(/281/);
    expect(validateText("x".repeat(280))).toBeNull();
  });

  it("keeps order and moves posts up and down", async () => {
    const id = await newUser();
    for (const t of ["A", "B", "C"]) queuePost(id, t);
    const ids = () => listPosts(id, "queued").map((p) => p.text);
    expect(ids()).toEqual(["A", "B", "C"]);
    movePost(id, listPosts(id, "queued")[2].id, -1);
    expect(ids()).toEqual(["A", "C", "B"]);
    movePost(id, listPosts(id, "queued")[0].id, 1);
    expect(ids()).toEqual(["C", "A", "B"]);
    movePost(id, listPosts(id, "queued")[0].id, -1); // already at the top: no-op
    expect(ids()).toEqual(["C", "A", "B"]);
  });

  it("never lets one user touch another user's posts", async () => {
    const owner = await newUser();
    const other = await newUser();
    queuePost(owner, "mine");
    const post = listPosts(owner, "queued")[0];
    movePost(other, post.id, 1);
    markPosted(other, post.id);
    expect(listPosts(owner, "queued")).toHaveLength(1);
  });
});

describe("schedule", () => {
  it("keeps valid, unique times within the plan's limit", async () => {
    const id = await newUser("pro");
    expect(saveSchedule(id, "pro", "Asia/Kolkata", ["21:00", "09:00", "09:00", "25:00", "bad", "13:30", "18:00"])).toEqual(["09:00", "13:30", "18:00"]);
    expect(getSlots(id)).toEqual(["09:00", "13:30", "18:00"]);
    expect(user(id).timezone).toBe("Asia/Kolkata");
  });

  it("computes local time in the user's timezone", () => {
    const at = new Date("2026-10-26T03:30:00Z");
    expect(localNow("Asia/Kolkata", at)).toEqual({ date: "2026-10-26", minutes: 9 * 60 });
    expect(localNow("UTC", at)).toEqual({ date: "2026-10-26", minutes: 3 * 60 + 30 });
  });
});

describe("autopilot (one-click mode)", () => {
  it("prepares the queued post at its time, exactly once", async () => {
    const id = await newUser();
    const now = new Date();
    saveSchedule(id, "free", "UTC", [hhmm(now)]);
    setAutopilot(id, true);
    queuePost(id, "From the queue");

    const first = (await runAutopilot(now)).filter((r) => r.userId === id);
    expect(first).toEqual([expect.objectContaining({ status: "ready", detail: "From the queue" })]);
    expect(listReady(id).map((p) => p.text)).toEqual(["From the queue"]);

    const second = (await runAutopilot(now)).filter((r) => r.userId === id);
    expect(second).toEqual([]);
  });

  it("writes a post when the queue is empty, and skips slots that are long past", async () => {
    const id = await newUser();
    const now = new Date();
    saveSchedule(id, "free", "UTC", [hhmm(now)]);
    setAutopilot(id, true);
    const results = (await runAutopilot(now)).filter((r) => r.userId === id);
    expect(results[0]?.status).toBe("ready");
    expect(results[0]?.detail.length).toBeGreaterThan(0);
    expect(results[0]?.detail.length).toBeLessThanOrEqual(280);

    const id2 = await newUser();
    saveSchedule(id2, "free", "UTC", [hhmm(new Date(now.getTime() - 2 * 3_600_000))]);
    setAutopilot(id2, true);
    expect((await runAutopilot(now)).filter((r) => r.userId === id2)).toEqual([]);
  });

  it("does nothing while autopilot is off", async () => {
    const id = await newUser();
    const now = new Date();
    saveSchedule(id, "free", "UTC", [hhmm(now)]);
    expect((await runAutopilot(now)).filter((r) => r.userId === id)).toEqual([]);
  });

  it("enforces the daily limit for each plan", async () => {
    const free = await newUser("free");
    expect((await postNow(user(free))).status).toBe("ready");
    expect(await postNow(user(free))).toMatchObject({ status: "skipped", detail: expect.stringContaining("Daily limit") });

    const pro = await newUser("pro");
    for (let i = 0; i < 3; i++) expect((await postNow(user(pro))).status).toBe("ready");
    expect((await postNow(user(pro))).status).toBe("skipped");
  });

  it("skip puts a ready post back at the front of the queue; posting moves it to history", async () => {
    const id = await newUser("pro");
    queuePost(id, "first");
    queuePost(id, "second");
    await postNow(user(id));
    const ready = listReady(id)[0];
    expect(ready.text).toBe("first");
    unreadyPost(id, ready.id);
    expect(listPosts(id, "queued").map((p) => p.text)).toEqual(["first", "second"]);

    await postNow(user(id));
    markPosted(id, listReady(id)[0].id);
    expect(listPosts(id, "posted").map((p) => p.text)).toEqual(["first"]);
  });
});
