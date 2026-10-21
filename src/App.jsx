import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import CodeEditor from "@uiw/react-textarea-code-editor";
import Landing from "./Landing";
import Icon, { Brand } from "./components/Icon";
import GameArt from "./components/GameArt";
import { fetchGame } from "./lib/ai";
import {
  buildGenerationRequest,
  createWorkspace,
  getMode,
  hasGameCode,
} from "./lib/game-modes";
import { buildPlayableDocument } from "./lib/preview";
import threeStarter from "./templates/three-starter.html?raw";

function extractHTML(text) {
  const match = text.match(/\x60\x60\x60(?:html)?\s*([\s\S]*?)\x60\x60\x60/i);
  return (match ? match[1] : text).trim();
}

export default function App() {
  const initialMode = getMode(
    new URLSearchParams(window.location.search).get("mode"),
  ).id;
  const [mode, setMode] = useState(initialMode);
  const currentMode = getMode(mode);
  const [tab, setTab] = useState("chat");
  const [mobilePane, setMobilePane] = useState(
    initialMode === "3d" ? "play" : "build",
  );
  const [exportError, setExportError] = useState("");
  const [showHome, setShowHome] = useState(
    () =>
      !["2d", "3d"].includes(
        new URLSearchParams(window.location.search).get("mode"),
      ),
  );
  const [messages, setMessages] = useState(
    () => createWorkspace(initialMode, threeStarter).messages,
  );
  const [input, setInput] = useState("");
  const [code, setCode] = useState(
    () => createWorkspace(initialMode, threeStarter).code,
  );
  const [previewCode, setPreviewCode] = useState(code);
  const [threeRuntime, setThreeRuntime] = useState("");
  const [runtimeError, setRuntimeError] = useState("");
  const [runtimeAttempt, setRuntimeAttempt] = useState(0);
  const [previewError, setPreviewError] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({
    phase: "connecting",
    characters: 0,
  });
  const [elapsed, setElapsed] = useState(0);
  const [previewKey, setPreviewKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const chatEndRef = useRef(null);
  const previewTimeout = useRef(null);
  const abortRef = useRef(null);
  const inputRef = useRef(null);
  const editorWrapRef = useRef(null);
  const lineNumsRef = useRef(null);
  const iframeRef = useRef(null);
  const pendingPromptRef = useRef("");
  const workspacesRef = useRef({
    "2d": createWorkspace("2d"),
    "3d": createWorkspace("3d", threeStarter),
  });

  useEffect(() => {
    if (!fullscreen) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fullscreen]);

  useEffect(() => {
    if (mode !== "3d" || threeRuntime) return;
    let active = true;
    import("./lib/three-runtime.js")
      .then(({ default: runtime }) => {
        if (active) setThreeRuntime(runtime);
      })
      .catch(() => {
        if (active)
          setRuntimeError("The 3D engine could not load. Please retry.");
      });
    return () => {
      active = false;
    };
  }, [mode, threeRuntime, runtimeAttempt]);

  useEffect(() => {
    const onMessage = (event) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (
        event.data?.type === "vibestudio-preview-error" &&
        typeof event.data.message === "string"
      ) {
        setPreviewError(event.data.message.slice(0, 400));
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const previewDocument = useMemo(
    () =>
      mode === "3d" && !threeRuntime
        ? ""
        : buildPlayableDocument(previewCode, mode, threeRuntime),
    [previewCode, mode, threeRuntime],
  );

  const enterStudio = (requestedMode = "2d") => {
    const nextMode = getMode(requestedMode).id;
    if (nextMode !== mode) {
      workspacesRef.current[mode] = {
        code,
        messages,
        input: input || (loading ? pendingPromptRef.current : ""),
      };
      const controller = abortRef.current;
      abortRef.current = null;
      controller?.abort();
      clearTimeout(previewTimeout.current);
      const workspace = workspacesRef.current[nextMode];
      setMode(nextMode);
      setCode(workspace.code);
      setPreviewCode(workspace.code);
      setMessages(workspace.messages);
      setInput(workspace.input);
      setLoading(false);
      setFullscreen(false);
      setCopied(false);
      setPreviewError("");
      setPreviewKey((key) => key + 1);
    }
    setMobilePane(nextMode === "3d" ? "play" : "build");
    setExportError("");
    setShowHome(false);
    const url = new URL(window.location.href);
    url.searchParams.set("mode", nextMode);
    window.history.replaceState(null, "", url);
  };

  const goHome = () => {
    abortRef.current?.abort();
    setShowHome(true);
    const url = new URL(window.location.href);
    url.searchParams.delete("mode");
    window.history.replaceState(null, "", url);
  };

  const runPreview = () => {
    clearTimeout(previewTimeout.current);
    setPreviewError("");
    setPreviewCode(code);
    setPreviewKey((key) => key + 1);
  };

  useEffect(() => {
    if (messages.length <= 1 || tab !== "chat") return;
    chatEndRef.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }, [messages, tab]);

  useEffect(() => {
    return () => {
      clearTimeout(previewTimeout.current);
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!loading) return;
    const startedAt = Date.now();
    const timer = setInterval(
      () => setElapsed(Math.floor((Date.now() - startedAt) / 1000)),
      1000,
    );
    return () => clearInterval(timer);
  }, [loading]);

  useEffect(() => {
    if (tab !== "code") return;
    const textarea = editorWrapRef.current?.querySelector("textarea");
    if (!textarea) return;

    const scrollToCursor = () => {
      requestAnimationFrame(() => {
        const container = editorWrapRef.current;
        if (!container) return;
        const lineHeight = 12 * 1.7;
        const padding = 14;
        const currentLine =
          textarea.value.substring(0, textarea.selectionStart).split("\n")
            .length - 1;
        const cursorY = currentLine * lineHeight + padding;
        if (
          cursorY + lineHeight >
          container.scrollTop + container.clientHeight
        ) {
          container.scrollTop =
            cursorY + lineHeight - container.clientHeight + padding;
        } else if (cursorY < container.scrollTop + padding) {
          container.scrollTop = cursorY - padding;
        }
      });
    };

    textarea.addEventListener("keyup", scrollToCursor);
    textarea.addEventListener("click", scrollToCursor);
    return () => {
      textarea.removeEventListener("keyup", scrollToCursor);
      textarea.removeEventListener("click", scrollToCursor);
    };
  }, [tab]);

  const handleCodeChange = useCallback((val) => {
    setCode(val);
    clearTimeout(previewTimeout.current);
    previewTimeout.current = setTimeout(() => {
      setPreviewError("");
      setPreviewCode(val);
      setPreviewKey((k) => k + 1);
    }, 800);
  }, []);

  const sendMessage = async () => {
    const userText = input.trim();
    if (!userText || loading) return;

    setInput("");
    if (inputRef.current) inputRef.current.style.height = "88px";

    const isRefine = hasGameCode(code);
    pendingPromptRef.current = userText;
    setMessages((prev) => [...prev, { role: "user", content: userText }]);
    setLoading(true);
    setElapsed(0);
    setProgress({ phase: "connecting", characters: 0 });

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const { prompt, systemPrompt } = buildGenerationRequest(
      mode,
      userText,
      code,
    );

    try {
      const text = await fetchGame(prompt, {
        systemPrompt,
        signal: controller.signal,
        onProgress: setProgress,
      });
      if (abortRef.current !== controller) return;
      const html = extractHTML(text);
      setMobilePane("play");
      setCode(html);
      setPreviewCode(html);
      setPreviewError("");
      setPreviewKey((k) => k + 1);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: isRefine
            ? "Your changes are ready. Give it a play, or keep making it yours."
            : "Your game is ready! Jump into the preview and try it out.",
        },
      ]);
    } catch (err) {
      if (abortRef.current !== controller) return;
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: controller.signal.aborted
            ? "Generation stopped. Edit your prompt and try again whenever you're ready."
            : err.message || "Something went wrong. Please try again.",
        },
      ]);
      setInput((current) => current || userText);
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setLoading(false);
      }
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(
        buildPlayableDocument(code, mode, threeRuntime),
      );
      setExportError("");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setExportError(
        "Couldn’t copy your game. Use Download to save it instead.",
      );
    }
  };
  const downloadCode = () => {
    const blob = new Blob([buildPlayableDocument(code, mode, threeRuntime)], {
      type: "text/html",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = currentMode.fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasGame = hasGameCode(code);
  const engineReady = mode !== "3d" || Boolean(threeRuntime);

  if (showHome) return <Landing onEnterStudio={enterStudio} />;

  return (
    <div className={`studio ${fullscreen ? "studio-expanded" : ""}`}>
      <a className="skip-link" href="#studio-workspace">
        Skip to workspace
      </a>
      <header className="studio-nav">
        <button
          className="brand-button"
          onClick={goHome}
          aria-label="Back to VibeStudio home"
        >
          <Brand />
        </button>
        <div
          className="dimension-switch"
          role="group"
          aria-label="Game dimension"
        >
          {["2d", "3d"].map((dimension) => (
            <button
              key={dimension}
              aria-pressed={mode === dimension}
              onClick={() => enterStudio(dimension)}
            >
              <Icon
                name={dimension === "3d" ? "cube" : "controller"}
                size={16}
              />
              {dimension.toUpperCase()}
              <span className="dimension-name">
                {dimension === "3d" ? "Sandbox" : "Arcade"}
              </span>
            </button>
          ))}
        </div>
        <div className="studio-nav-actions">
          {hasGame ? (
            <>
              <button
                className="button button-small button-quiet copy-action"
                onClick={copyCode}
                disabled={!engineReady}
              >
                <Icon name={copied ? "check" : "copy"} size={16} />
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                className="button button-small button-primary"
                onClick={downloadCode}
                disabled={!engineReady}
                aria-label="Download game"
              >
                <Icon name="download" size={16} />
                <span>Download game</span>
              </button>
            </>
          ) : (
            <span className="studio-nav-hint">
              Good ideas deserve a play button.
            </span>
          )}
        </div>
      </header>

      <div className="mobile-pane-switch" role="group" aria-label="Studio view">
        <button
          aria-pressed={mobilePane === "build"}
          onClick={() => setMobilePane("build")}
        >
          <Icon name="spark" size={16} /> Build
        </button>
        <button
          aria-pressed={mobilePane === "play"}
          onClick={() => setMobilePane("play")}
        >
          <Icon name="play" size={16} /> Play
        </button>
      </div>
      {exportError && (
        <div className="studio-alert" role="alert">
          {exportError}
        </div>
      )}
      <div role="status" className="sr-only">
        {copied ? "Game HTML copied to clipboard." : ""}
      </div>

      <main id="studio-workspace" className="studio-main">
        <section
          className="builder-panel"
          data-active={mobilePane === "build"}
          aria-label="Game builder"
        >
          <div className="builder-header">
            <div className="builder-heading">
              <span className="small-mode-mark">
                <Icon name={mode === "3d" ? "cube" : "controller"} size={20} />
              </span>
              <div>
                <h1>{mode === "3d" ? "3D sandbox" : "Arcade builder"}</h1>
                <p>Your idea. Your rules.</p>
              </div>
            </div>
            <span className="session-tag">{mode.toUpperCase()}</span>
          </div>
          <div className="builder-tabs" role="tablist" aria-label="Build tools">
            {[
              ["chat", "spark", "Create"],
              ["code", "code", "Code"],
            ].map(([id, icon, label]) => (
              <button
                key={id}
                id={`${id}-tab`}
                role="tab"
                aria-selected={tab === id}
                aria-controls={`${id}-panel`}
                tabIndex={tab === id ? 0 : -1}
                onClick={() => setTab(id)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                    event.preventDefault();
                    const nextTab = id === "chat" ? "code" : "chat";
                    setTab(nextTab);
                    document.getElementById(`${nextTab}-tab`)?.focus();
                  }
                }}
              >
                <Icon name={icon} size={16} />
                {label}
              </button>
            ))}
          </div>

          {tab === "chat" && (
            <div
              className="builder-content"
              id="chat-panel"
              role="tabpanel"
              aria-labelledby="chat-tab"
            >
              <div className="chat-scroll">
                {messages.length <= 1 && (
                  <div className="chat-intro">
                    <span className="intro-icon">
                      <Icon name="spark" size={29} />
                    </span>
                    <h2>
                      {mode === "3d"
                        ? "A whole world of what-ifs."
                        : "What are we playing?"}
                    </h2>
                    <p>
                      {mode === "3d"
                        ? "The island is just the beginning. Where do we go next?"
                        : "Start with a wild idea. We’ll find the fun."}
                    </p>
                  </div>
                )}
                <div
                  className="messages"
                  aria-label="Game conversation"
                  aria-live="polite"
                  aria-relevant="additions"
                >
                  {messages.slice(1).map((message, index) => (
                    <div
                      key={index}
                      className={`message message-${message.role}`}
                    >
                      <div className="message-author">
                        {message.role === "assistant" ? (
                          <>
                            <span className="assistant-mark">
                              <Icon name="spark" size={12} />
                            </span>
                            VibeStudio
                          </>
                        ) : (
                          "You"
                        )}
                      </div>
                      <div className="message-bubble">{message.content}</div>
                    </div>
                  ))}
                  {loading && (
                    <div className="message message-assistant">
                      <div className="message-author">
                        <span className="assistant-mark">
                          <Icon name="spark" size={12} />
                        </span>
                        VibeStudio
                      </div>
                      <div
                        className="message-bubble generation-status"
                        role="status"
                      >
                        <div>
                          <span className="loading-spinner" />
                          {progress.phase === "writing"
                            ? "Building your game…"
                            : progress.phase === "thinking"
                              ? "Dreaming up your world…"
                              : "Getting things ready…"}
                        </div>
                        <p>
                          {Math.floor(elapsed / 60)}:
                          {String(elapsed % 60).padStart(2, "0")} elapsed
                          {progress.characters > 0
                            ? ` · ${progress.characters.toLocaleString()} characters written`
                            : " · Great worlds take a little time."}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <div ref={chatEndRef} />
              </div>
              {messages.length <= 1 && (
                <div className="suggestions-wrap">
                  <p>Need a starting point?</p>
                  <div className="suggestion-grid">
                    {currentMode.suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => {
                          setInput(suggestion);
                          inputRef.current?.focus();
                        }}
                      >
                        <span>{suggestion}</span>
                        <Icon name="arrow" size={14} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <form
                className="prompt-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  sendMessage();
                }}
              >
                <div className="prompt-box">
                  <label className="sr-only" htmlFor="game-prompt">
                    Game prompt
                  </label>
                  <textarea
                    ref={inputRef}
                    id="game-prompt"
                    name="gamePrompt"
                    autoComplete="off"
                    placeholder={
                      mode === "3d"
                        ? "What should we add to this world?"
                        : "A space runner where gravity keeps changing…"
                    }
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKey}
                    disabled={loading}
                    rows={3}
                  />
                  <div className="prompt-actions">
                    <span>
                      <kbd>↵</kbd> to build{" "}
                      <span className="prompt-newline">
                        · Shift + Enter for a new line
                      </span>
                    </span>
                    {loading ? (
                      <button
                        type="button"
                        className="prompt-submit stop-button"
                        onClick={() => abortRef.current?.abort()}
                        aria-label="Stop generation"
                      >
                        <Icon name="stop" size={15} />
                        Stop
                      </button>
                    ) : (
                      <button
                        type="submit"
                        className="prompt-submit"
                        disabled={!input.trim()}
                        aria-label="Generate game"
                      >
                        <Icon name="spark" size={15} />
                        {hasGame ? "Remix" : "Build"}
                        <Icon name="arrow" size={15} />
                      </button>
                    )}
                  </div>
                </div>
                <p className="prompt-note">
                  {mode === "3d"
                    ? "Keep exploring while your next idea takes shape."
                    : "Build something. Break something. Find the fun."}
                </p>
              </form>
            </div>
          )}

          {tab === "code" && (
            <div
              className="builder-content code-content"
              id="code-panel"
              role="tabpanel"
              aria-labelledby="code-tab"
            >
              <div className="code-toolbar">
                <span>
                  game-{mode}.html{" "}
                  <span className="line-count">
                    {code.split("\n").length} lines
                  </span>
                </span>
                <button
                  className="button button-small button-outline"
                  onClick={runPreview}
                >
                  <Icon name="play" size={13} />
                  Run
                </button>
              </div>
              <div
                className="editor-wrap"
                ref={editorWrapRef}
                data-color-mode="dark"
              >
                <div
                  className="line-numbers"
                  ref={lineNumsRef}
                  aria-hidden="true"
                >
                  {code.split("\n").map((_, index) => (
                    <div key={index}>{index + 1}</div>
                  ))}
                </div>
                <CodeEditor
                  id="game-code"
                  name="gameCode"
                  aria-label="Game HTML code"
                  value={code}
                  language="html"
                  spellCheck={false}
                  autoComplete="off"
                  onChange={(event) => handleCodeChange(event.target.value)}
                  padding={14}
                  style={{
                    flex: 1,
                    fontSize: 12,
                    fontFamily: "'JetBrains Mono', monospace",
                    lineHeight: 1.7,
                    background: "transparent",
                    minWidth: 0,
                  }}
                />
              </div>
              <p className="code-note">
                <span className="status-dot" /> Changes update the preview
                automatically.
              </p>
            </div>
          )}
        </section>

        <section
          className="preview-panel"
          data-active={mobilePane === "play"}
          aria-label="Game preview"
        >
          <div className="preview-toolbar">
            <div>
              <span className="status-dot" />
              <h2>Playground</h2>
              <span className="preview-mode-tag">{mode.toUpperCase()}</span>
            </div>
            <div className="preview-actions">
              <button
                className="icon-button"
                onClick={runPreview}
                aria-label="Restart preview"
                title="Restart preview"
              >
                <Icon name="refresh" size={17} />
              </button>
              <button
                className="icon-button"
                onClick={() => setFullscreen((value) => !value)}
                aria-label={fullscreen ? "Restore layout" : "Expand preview"}
                title={fullscreen ? "Restore layout" : "Expand preview"}
              >
                <Icon name={fullscreen ? "close" : "expand"} size={17} />
              </button>
            </div>
          </div>
          {previewError && (
            <div role="alert" className="studio-alert">
              Preview error: {previewError}. Edit the code or ask for a fix,
              then run again.
            </div>
          )}
          <div className={`preview-stage ${!hasGame ? "stage-empty" : ""}`}>
            {!hasGame ? (
              <div className="empty-playground">
                <GameArt mode="2d" />
                <h2>Your next game starts here.</h2>
                <p>
                  Give your imagination a play button.
                  <br />
                  Describe a game to bring it to life.
                </p>
                <button
                  className="button button-outline mobile-create-button"
                  onClick={() => setMobilePane("build")}
                >
                  <Icon name="spark" size={16} />
                  Create a game
                </button>
              </div>
            ) : engineReady ? (
              <iframe
                ref={iframeRef}
                key={previewKey}
                srcDoc={previewDocument}
                sandbox="allow-scripts"
                title={mode === "3d" ? "3D Game Preview" : "Game Preview"}
              />
            ) : (
              <div role="status" className="engine-loading">
                <span className="loading-spinner" />
                <h2>
                  {runtimeError
                    ? "Let’s try that again."
                    : "Opening a new dimension…"}
                </h2>
                <p>{runtimeError || "Your 3D playground is getting ready."}</p>
                {runtimeError && (
                  <button
                    className="button button-outline"
                    onClick={() => {
                      setRuntimeError("");
                      setRuntimeAttempt((attempt) => attempt + 1);
                    }}
                  >
                    Retry 3D engine
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="preview-footer">
            <span>
              <Icon name={mode === "3d" ? "cube" : "controller"} size={15} />
              {hasGame
                ? "Click inside to play"
                : "Waiting for your imagination"}
            </span>
            <span>
              {mode === "3d"
                ? "WASD / arrows · Drag to look"
                : hasGame
                  ? "Your game. Your rules."
                  : "Made to be played."}
            </span>
          </div>
        </section>
      </main>
      <footer className="studio-statusbar">
        <span>
          <span className="status-dot" />
          {loading
            ? "Building your next adventure"
            : "All systems ready for play"}
        </span>
        <span>Made of ideas. Powered by Sarvam.</span>
      </footer>
    </div>
  );
}
