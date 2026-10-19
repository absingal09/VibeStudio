async function* readEvents(body) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      let boundary;
      while ((boundary = /\r?\n\r?\n/.exec(buffer))) {
        const event = buffer.slice(0, boundary.index);
        buffer = buffer.slice(boundary.index + boundary[0].length);
        const data = event.split(/\r?\n/)
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart()).join("\n");
        if (data) yield data;
      }
      if (done) break;
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export async function fetchGame(prompt, { systemPrompt, signal, onProgress = () => {} }) {
  const timeout = AbortSignal.timeout(250_000);
  const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, systemPrompt, stream: true }),
      signal: requestSignal,
    });
    if (!res.ok || !res.headers.get("content-type")?.includes("text/event-stream")) {
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Generation failed (${res.status}). Please try again.`);
      if (typeof data?.text !== "string" || !data.text.trim()) throw new Error("Sarvam returned no game code. Please try again.");
      return data.text;
    }
    if (!res.body) throw new Error("The generation stream is unavailable. Please try again.");

    onProgress({ phase: "thinking", characters: 0 });
    let text = "";
    let completed = false;
    let finishReason;
    let lastProgress = 0;
    for await (const data of readEvents(res.body)) {
      if (data === "[DONE]") {
        completed = true;
        break;
      }
      let event;
      try { event = JSON.parse(data); }
      catch { throw new Error("Sarvam returned an unreadable response. Please try again."); }
      if (event.error) throw new Error(event.error.message || event.error);
      const choice = event.choices?.[0];
      if (choice?.finish_reason) finishReason = choice.finish_reason;
      if (typeof choice?.delta?.content === "string") {
        const firstCode = !text;
        text += choice.delta.content;
        if (firstCode || Date.now() - lastProgress >= 250) {
          onProgress({ phase: "writing", characters: text.length });
          lastProgress = Date.now();
        }
      }
    }
    requestSignal.throwIfAborted();
    if (finishReason === "length") throw new Error("Sarvam reached the generation limit. Try a simpler game or a smaller change.");
    if (!completed) throw new Error("The connection ended before the game was complete. Please try again.");
    if (!text.trim()) throw new Error("Sarvam returned no game code. Please try again.");
    return text;
  } catch (error) {
    if (timeout.aborted && !signal?.aborted) {
      throw new Error("Generation timed out. Try a simpler game or a smaller change.", { cause: error });
    }
    throw error;
  }
}
