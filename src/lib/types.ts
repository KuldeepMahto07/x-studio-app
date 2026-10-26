export type Plan = "free" | "pro" | "creator";
export type PostStatus = "draft" | "queued" | "posting" | "ready" | "posted" | "failed";

export type User = {
  id: string;
  x_user_id: string;
  x_handle: string;
  name: string;
  email: string | null;
  avatar_url: string | null;
  plan: Plan;
  timezone: string;
  autopilot: number;
  created_at: string;
};

export type Niche = {
  niche: string;
  audience: string;
  voice: string;
  topics: string[];
  formats: string[];
};

export type Post = {
  id: string;
  user_id: string;
  text: string;
  topic: string;
  format: string;
  status: PostStatus;
  position: number | null;
  slot_key: string | null;
  x_post_id: string | null;
  error: string | null;
  created_at: string;
  posted_at: string | null;
};

export const MAX_POST_LEN = 280;

export const PLANS: Record<Plan, { label: string; price: string; postsPerDay: number; postsPerMonth: number; maxSlots: number }> = {
  free: { label: "Free", price: "$0", postsPerDay: 1, postsPerMonth: 10, maxSlots: 1 },
  pro: { label: "Pro", price: "$9/mo", postsPerDay: 3, postsPerMonth: 100, maxSlots: 3 },
  creator: { label: "Creator", price: "$19/mo", postsPerDay: 10, postsPerMonth: 320, maxSlots: 10 },
};

/** X's share link: opens the composer with the text filled in. Free, no API needed. */
export const xIntentUrl = (text: string) => `https://x.com/intent/post?text=${encodeURIComponent(text)}`;
