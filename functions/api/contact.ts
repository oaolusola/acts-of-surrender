export const onRequestPost = async (context: any) => {
  try {
    const { request } = context;

    // Only allow JSON
    const ct = request.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      return json({ error: "Invalid request." }, 400);
    }

    const body = await request.json();

    // Honeypot
    if (body.company) {
      return json({ ok: true }, 200);
    }

    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    const message = String(body.message || "").trim();

    if (!name || !email || !message) {
      return json({ error: "Please fill in all fields." }, 400);
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: "Please enter a valid email address." }, 400);
    }

    const TO_EMAIL = "admin@acts-of-surrender.com";

    const mailPayload = {
      personalizations: [
        {
          to: [{ email: TO_EMAIL }],
          reply_to: {
            email,
            name,
          },
        },
      ],
      from: {
        email: "noreply@acts-of-surrender.pages.dev",
        name: "Acts of Surrender",
      },
      subject: `New message from ${name}`,
      content: [
        {
          type: "text/plain",
          value: `Name: ${name}\nEmail: ${email}\n\n${message}`,
        },
      ],
    };

    const resp = await fetch("https://api.mailchannels.net/tx/v1/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(mailPayload),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("MailChannels error:", resp.status, errText);

      return json(
        { error: "Failed to send message." },
        502
      );
    }

    return json({ ok: true }, 200);
  } catch (err) {
    console.error(err);
    return json({ error: "Server error." }, 500);
  }
};

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
