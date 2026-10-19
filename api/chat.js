export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { prompt, systemPrompt, stream = false } = req.body ?? {};
  if (typeof prompt !== "string" || !prompt.trim()) {
    return res.status(400).json({ error: "Missing prompt" });
  }
  if (typeof systemPrompt !== "string" || !systemPrompt.trim()) {
    return res.status(400).json({ error: "Missing game instructions" });
  }

  const apiKey = process.env.SARVAM_API_KEY?.trim();
  if (!apiKey) {
    return res.status(503).json({ error: "Sarvam API key is not configured." });
  }

  const controller = new AbortController();
  const cancel = () => controller.abort();
  res.on?.("close", cancel);
  let streaming = false;
  let heartbeat;

  try {
    const response = await fetch("https://api.sarvam.ai/v2/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-subscription-key": apiKey,
      },
      body: JSON.stringify({
        model: "glm5.3",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        reasoning_effort: "high",
        max_tokens: 32768,
        temperature: 1,
        stream: stream === true,
      }),
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(240_000)]),
    });

    if (response.ok && stream === true && response.headers.get("content-type")?.includes("text/event-stream")) {
      if (!response.body) throw new Error("Missing response stream");
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("X-Accel-Buffering", "no");
      streaming = true;
      res.flushHeaders?.();
      res.write(": connected\n\n");
      heartbeat = setInterval(() => res.write(": heartbeat\n\n"), 10_000);
      for await (const chunk of response.body) res.write(chunk);
      return res.end();
    }

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message = data?.error?.message;
      return res.status(response.status).json({
        error: typeof message === "string" ? message : "Sarvam request failed (" + response.status + ").",
      });
    }

    const choice = data?.choices?.[0];
    if (choice?.finish_reason === "length") {
      return res.status(502).json({
        error: "Sarvam reached the generation limit before completing the game. Try a simpler game or a smaller change.",
      });
    }

    const text = choice?.message?.content;
    if (typeof text !== "string" || !text.trim()) {
      return res.status(502).json({ error: "Sarvam returned no game code. Please try again." });
    }

    return res.json({ text });
  } catch (error) {
    if (controller.signal.aborted) return;
    const timedOut = error.name === "TimeoutError" || error.name === "AbortError";
    const failure = {
      error: timedOut
        ? "Sarvam took too long to respond. Please try again."
        : "Unable to reach Sarvam. Please try again.",
    };
    if (streaming) {
      res.write("data: " + JSON.stringify(failure) + "\n\n");
      return res.end();
    }
    return res.status(timedOut ? 504 : 502).json(failure);
  } finally {
    clearInterval(heartbeat);
    res.off?.("close", cancel);
  }
}
