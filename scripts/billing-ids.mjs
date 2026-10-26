// Lists your Lemon Squeezy stores and product variants, so you can copy the IDs into .env.local.
// Usage: npm run billing:ids   (reads LEMONSQUEEZY_API_KEY from .env.local; only reads, never changes anything)
import { readFileSync } from "node:fs";

function readEnvKey(name) {
  if (process.env[name]) return process.env[name];
  try {
    const line = readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/).find((l) => l.startsWith(`${name}=`));
    return line?.slice(name.length + 1).trim().replace(/^"|"$/g, "") ?? "";
  } catch {
    return "";
  }
}

const key = readEnvKey("LEMONSQUEEZY_API_KEY");
if (!key) {
  console.error("Add LEMONSQUEEZY_API_KEY to .env.local first (Lemon Squeezy → Settings → API).");
  process.exit(1);
}

async function api(path) {
  const res = await fetch(`https://api.lemonsqueezy.com/v1/${path}`, {
    headers: { Accept: "application/vnd.api+json", Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

const stores = await api("stores");
console.log("\nStores");
for (const s of stores.data) {
  console.log(`  LEMONSQUEEZY_STORE_ID=${s.id}   ${s.attributes.name} (${s.attributes.currency})`);
}

const products = await api("products?page[size]=100");
const productNames = Object.fromEntries(products.data.map((p) => [p.id, p.attributes.name]));
const variants = await api("variants?page[size]=100");
console.log("\nVariants (use the subscription ones)");
for (const v of variants.data) {
  const a = v.attributes;
  const price = typeof a.price === "number" ? `$${(a.price / 100).toFixed(2)}` : "";
  const billing = a.is_subscription ? `every ${a.interval_count > 1 ? a.interval_count + " " : ""}${a.interval}` : "one-time";
  console.log(`  ${String(v.id).padEnd(8)} ${productNames[a.product_id] ?? "?"} / ${a.name}  ${price} ${billing}  [${a.status}]`);
}

const guess = (word) => variants.data.find((v) => v.attributes.is_subscription && v.attributes.name.toLowerCase().includes(word))?.id;
const pro = guess("pro");
const creator = guess("creator");
if (pro || creator) {
  console.log("\nSuggested .env.local lines");
  if (pro) console.log(`  LEMONSQUEEZY_VARIANT_PRO=${pro}`);
  if (creator) console.log(`  LEMONSQUEEZY_VARIANT_CREATOR=${creator}`);
}
console.log("\nNote: a test-mode API key only sees test-mode products; a live key only sees live ones.\n");
