import "server-only";

// Sends email through Resend when RESEND_API_KEY and MAIL_FROM are set.
// Without them (local development), the message is printed to the server log instead.
export async function sendMail(msg: { to: string; subject: string; text: string; html: string }): Promise<{ sent: boolean }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!key || !from) {
    console.log(`\n[mail] (not sent: no RESEND_API_KEY) To: ${msg.to}\n[mail] Subject: ${msg.subject}\n[mail] ${msg.text}\n`);
    return { sent: false };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: msg.to, subject: msg.subject, text: msg.text, html: msg.html }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    console.error("[mail] Resend error", res.status, (await res.text()).slice(0, 200));
    return { sent: false };
  }
  return { sent: true };
}
