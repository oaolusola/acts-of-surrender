export const onRequestPost: PagesFunction = async (context) => {
  try {
    const { request, env } = context;

    // Basic content-type check
    const ct = request.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      return json({ error: "Invalid request." }, 400);
    }

    const body = (await request.json()) as Record<string, unknown>;

    // Honeypot: if filled, silently pretend success
    const company = String(body.company ?? "").trim();
    if (company) return json({ ok: true }, 200);

    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim();
    const message = String(body.message ?? "").trim();

    if (!name || !email || !message) {
      return json({ error: "Please fill in all fields." }, 400);
    }

    // Light validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: "Please enter a valid email address." }, 400);
    }

    // Cloudflare env vars (you’ll set these in Cloudflare Pages later)
    const TO_EMAIL = (env.TO_EMAIL as string) || "";
    const FROM_EMAIL = (env.FROM_EMAIL as string) || "";

    if (!TO_EMAIL || !FROM_EMAIL) {
      // Don’t leak configuration details to users
      return json({ error: "Email service not configured yet." }, 500);
    }

    // MailChannels (built-in option commonly used on Cloudflare Workers/Pages)
    // Note: some sender domains may require verification depending on your setup.
    const subject = `New message from Acts of Surrender site: ${name}`;
    const text = `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}\n`;

    const mailPayload = {
      personalizations: [
        {
          to: [{ email: TO_EMAIL }],
          reply_to: { email, name },
        },
      ],
      from: { email: FROM_EMAIL, name: "Acts of Surrender" },
      subject,
      content: [{ type: "text/plain", value: text }],
    };

    const resp = await fetch("https://api.mailchannels.net/tx/v1/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(mailPayload),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      return json({ error: "Failed to send message." }, 502, errText);
    }

    return json({ ok: true }, 200);
  } catch {
    return json({ error: "Unexpected server error." }, 500);
  }
};

function json(body: any, status = 200, debug?: string) {
  // You can log debug later in Cloudflare if needed; we don’t return it to the client.
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
}
