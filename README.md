# VibeStudio

A prompt-to-game platform where you can generate, edit, and preview browser games live with full code visibility to learn as you build.

**[Live Demo →](https://learn-vibe-studio.vercel.app)**

---

## What It Does

Type a plain-English description of a game. VibeStudio uses Sarvam's API to generate a playable HTML5 game with a start screen, scoring, and a game-over screen. You can then edit the code live and see updates in real time, or keep chatting to refine the game further. Generation time depends on the request and model reasoning.

---

## Features

- **2D and 3D studios** — generate Canvas games or genuine Three.js/WebGL games, with separate code and chat sessions for each mode
- **Playable 3D starter** — open the 3D Sandbox and explore Crystal Island immediately; collect crystals, orbit the camera, and race the timer
- **Live code editor** — syntax-highlighted editor with line numbers; changes reflect in the preview automatically
- **Sandboxed live preview** — games run in an isolated `<iframe sandbox="allow-scripts">` with no external dependencies
- **Iterative refinement** — chat to request changes; the AI reads the existing code and applies only what you asked
- **Copy & download** — export the generated game as a standalone `.html` file
- **Self-contained 3D exports** — the Three.js engine is bundled into previews and downloads; games need no CDN, external assets, or extra API key
- **Fullscreen preview** — expand the game to fill the screen
- **One AI integration** — GLM-5.3 through Sarvam's Chat Completion V2 API, using one server-side API key
- **Interactive landing page** — animated hero, particle effects, parallax orbs, and a playable mini breakout demo

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8 |
| AI | Sarvam Chat Completion V2 — GLM-5.3 |
| Code Editor | `@uiw/react-textarea-code-editor` |
| 3D Runtime | Three.js 0.186.1 / WebGL2 |
| Styling | Inline styles + CSS-in-JS (no external CSS framework) |
| Deployment | Vercel |

---

## Architecture

### AI Pipeline

```
User Prompt
    ↓
POST /api/chat (server-side)
    ↓
Sarvam Chat Completion V2 — glm5.3
    ↓
Response
    ↓
extractHTML()  →  Live Preview iframe
```

- One request to `https://api.sarvam.ai/v2/chat/completions` per generation or edit; no key rotation, retries, or fallback providers
- Uses `glm5.3`, high reasoning effort, and a 32,768-token completion budget (including reasoning). High effort avoids the extra latency of maximum reasoning for routine game requests
- The server reads `SARVAM_API_KEY` and sends it in the `api-subscription-key` header; the browser never receives the key
- Provider errors and timeouts are shown in chat. Empty or truncated completions are rejected so they do not replace the current game
- The studio streams progress through the design and code-writing stages, with an elapsed timer and a Stop button. Stopping cancels the upstream request and keeps your existing game and prompt
- A browser-side 250-second timeout releases the input even if the server connection stalls

### Game Sandboxing

Every generated game runs inside:
```html
<iframe sandbox="allow-scripts" srcDoc={generatedHTML} />
```

This means:
- No access to the parent page's DOM, cookies, or localStorage
- Fully self-contained — all assets are generated programmatically (Canvas shapes, gradients, procedural art)

### System Prompt Engineering

The AI is given a strict system prompt that enforces:
- Single-file HTML output (no markdown, no code fences)
- `requestAnimationFrame` game loops (never `setInterval`)
- 2D mode: HTML5 Canvas rendering with vanilla JavaScript
- 3D mode: Three.js meshes, procedural geometry, lighting, cameras, and WebGL rendering; the studio supplies the bundled engine as `window.THREE`
- Mandatory start screen, score counter, and game-over screen
- Responsive canvas that fills the viewport
- No external assets, loaders, imports, or CDN libraries; 3D uses only the provided Three.js core

### 3D Sandbox

Choose **3D Sandbox** on the landing page or use the **2D / 3D** buttons in the studio. The default Crystal Island game works without an AI request. Click **Explore island**, use WASD/arrow keys or the on-screen controls to move, drag to orbit the camera, and scroll to zoom. Chat can refine the starter or build a different 3D game.

The engine loads only when 3D is opened. The preview stays in the same `allow-scripts` sandbox, and preview errors appear above it. The code editor shows game code; Copy and Download automatically include the engine and its license. Switching modes preserves each mode's code, chat, and draft for the current browser session; reloading the page resets them.

3D requires a browser with WebGL2 support. There is a readable fallback message when it is unavailable. Multiplayer and AI NPCs remain planned features.

---

## Local Setup

```bash
# Clone the repo
git clone https://github.com/absingal09/VibeStudio.git
cd VibeStudio

# Install dependencies
npm ci

# Create your .env file
cp .env.example .env
# Add your Sarvam API key to .env

# Start the dev server
npm run dev
```

### Environment Variables

Create a `.env` file in the root with:

```
SARVAM_API_KEY=your_sarvam_api_key
```

Get your key from the [Sarvam dashboard](https://dashboard.sarvam.ai/). GLM-5.3 requires [Chat Completion V2 beta access](https://docs.sarvam.ai/api-reference/beta-apis) on that key. Sarvam recommends it for the hardest coding and multi-step agent tasks in its [model guide](https://docs.sarvam.ai/api/getting-started/models/openweight).

On Windows PowerShell, use `Copy-Item .env.example .env` if you need to create the file. Keep `.env` in the project root, next to `package.json`, and restart the development server after changing it. Do not prefix the key with `VITE_`: it belongs only on the server. Local `.env` files are ignored by Git.

`npm run dev` serves both the frontend and `/api/chat` locally. `npm run preview` only previews the built frontend; it does not run the API endpoint.

---

## Deployment

For Vercel, add `SARVAM_API_KEY` in:

**Vercel Dashboard → Project → Settings → Environment Variables**

The `api/chat.js` function serves the endpoint in production. `vercel.json` gives the function up to 300 seconds, while outbound Sarvam requests time out after 240 seconds. Pushing these changes to a connected Vercel project triggers its configured deployment workflow.

---

## Project Structure

```
api/chat.js        # Single Sarvam request handler
server/chat-api.js # Vite adapter for the same endpoint during development
server/three-runtime.js # Builds a portable Three.js runtime for previews and exports
.env.example      # One server-side API key setting
src/
├── App.jsx        # Main studio — chat, code editor, live preview, AI pipeline
├── Landing.jsx    # Landing page — hero, game modes, how it works, mini breakout demo
├── index.css      # Global resets
└── main.jsx       # React entry point
```

---

## How the Code Editor Works

The editor is a `<textarea>` with syntax highlighting overlaid via `@uiw/react-textarea-code-editor`. Line numbers are synced to the textarea scroll position manually using a `scroll` event listener and a ref. Code changes trigger a debounced preview refresh (800ms) so the iframe updates as you type without thrashing.

---

## Checks

```bash
npm test
npm run build
npm run lint
```

API tests mock Sarvam responses; they do not use a real key or consume credits. A live generation requires a configured key with GLM-5.3 beta access. Credits and rate limits follow your Sarvam account.

---

## Roadmap

- [x] 3D game generation (WebGL / Three.js)
- [ ] Multiplayer rooms (WebSocket)
- [ ] AI NPCs with live decision-making
- [ ] Game gallery / sharing
- [ ] User accounts and saved games
