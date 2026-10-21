import { useState } from "react";
import Icon, { Brand } from "./components/Icon";
import GameArt from "./components/GameArt";

export default function Landing({ onEnterStudio }) {
  const [showcase, setShowcase] = useState("3d");
  return (
    <div className="landing">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="landing-nav page-width">
        <a className="brand-link" href="/" aria-label="VibeStudio home">
          <Brand />
        </a>
        <nav aria-label="Main navigation">
          <a href="#game-modes">Game modes</a>
          <a href="#how-it-works">How it works</a>
          <button
            className="button button-small button-outline"
            onClick={() => onEnterStudio("2d")}
          >
            Open studio <Icon name="arrow" size={16} />
          </button>
        </nav>
      </header>

      <main id="main-content">
        <section className="hero page-width" aria-labelledby="hero-title">
          <div className="hero-copy">
            <div className="hero-note">
              <span className="status-dot" /> Your imagination. Now playable.
            </div>
            <h1 id="hero-title">
              Got an idea?
              <br />
              Make it a game.
            </h1>
            <p>
              Strange worlds. Impossible levels. That one game you wish existed.
              Describe it, play it, make it yours.
            </p>
            <div className="hero-actions">
              <button
                className="button button-primary"
                onClick={() => onEnterStudio("2d")}
              >
                <Icon name="controller" /> Create a game
              </button>
              <button
                className="text-button"
                onClick={() => onEnterStudio("3d")}
              >
                Explore the 3D sandbox <Icon name="arrow" size={17} />
              </button>
            </div>
            <div className="hero-footnote">
              <span>No signup needed</span>
              <span>Yours to remix & download</span>
            </div>
          </div>

          <div className="hero-showcase">
            <div className="showcase-top">
              <span className="showcase-title">
                <span className="status-dot" />
                {showcase === "3d" ? "Crystal Island" : "Pixel Playground"}
              </span>
              <div
                className="showcase-switch"
                role="group"
                aria-label="Featured game dimension"
              >
                {["2d", "3d"].map((mode) => (
                  <button
                    key={mode}
                    aria-pressed={mode === showcase}
                    onClick={() => setShowcase(mode)}
                  >
                    {mode.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="showcase-world">
              <span className="world-orbit orbit-one" />
              <span className="world-orbit orbit-two" />
              <GameArt mode={showcase} />
              <span className="world-tag">
                <Icon
                  name={showcase === "3d" ? "cube" : "controller"}
                  size={14}
                />
                {showcase === "3d"
                  ? "A little world. A lot of possibility."
                  : "Big adventures. Little pixels."}
              </span>
            </div>
            <div className="showcase-bottom">
              <div>
                <span className="showcase-caption">
                  {showcase === "3d"
                    ? "Your next adventure starts here"
                    : "Every great game starts with an idea"}
                </span>
                <p>
                  {showcase === "3d"
                    ? "A playable world, ready for your twist."
                    : "Dream up your own arcade classic."}
                </p>
              </div>
              <button
                className="round-button"
                aria-label={
                  showcase === "3d"
                    ? "Play Crystal Island"
                    : "Open 2D Game Builder"
                }
                onClick={() => onEnterStudio(showcase)}
              >
                <Icon name="play" size={21} />
              </button>
            </div>
          </div>
        </section>

        <div className="possibility-strip">
          <div className="page-width">
            <span>
              <Icon name="spark" size={18} /> Dream it up
            </span>
            <span>
              <Icon name="controller" size={18} /> Play it instantly
            </span>
            <span>
              <Icon name="code" size={18} /> Make it your own
            </span>
            <span>
              <Icon name="download" size={18} /> Take it anywhere
            </span>
          </div>
        </div>

        <section
          className="mode-section page-width"
          id="game-modes"
          aria-labelledby="modes-title"
        >
          <div className="section-heading">
            <div>
              <span className="section-kicker">Choose your playground</span>
              <h2 id="modes-title">
                Different dimensions.
                <br />
                Same wild imagination.
              </h2>
            </div>
            <p>
              Start with a blank canvas or jump into a world.
              <br />
              There’s no wrong way to play.
            </p>
          </div>
          <div className="mode-grid">
            <article className="mode-card mode-2d">
              <div className="mode-art">
                <GameArt mode="2d" />
                <span className="mode-chip">2D</span>
              </div>
              <div className="mode-card-content">
                <div className="mode-title-row">
                  <h3>Arcade builder</h3>
                  <span className="availability">
                    <span className="status-dot" /> Ready to create
                  </span>
                </div>
                <p>
                  Side scrollers, space snakes, neon pinball. Turn your what-if
                  into a one-more-try.
                </p>
                <button
                  className="button button-outline"
                  aria-label="Open 2D Game Builder"
                  onClick={() => onEnterStudio("2d")}
                >
                  Build in 2D <Icon name="arrow" size={17} />
                </button>
              </div>
            </article>
            <article className="mode-card mode-3d">
              <div className="mode-art">
                <GameArt mode="3d" />
                <span className="mode-chip">3D</span>
              </div>
              <div className="mode-card-content">
                <div className="mode-title-row">
                  <h3>3D sandbox</h3>
                  <span className="availability">
                    <span className="status-dot" /> Ready to explore
                  </span>
                </div>
                <p>
                  Collect crystals. Chase a sunset. Invent a world that plays by
                  your rules.
                </p>
                <button
                  className="button button-outline"
                  aria-label="Open 3D Sandbox"
                  onClick={() => onEnterStudio("3d")}
                >
                  Step into 3D <Icon name="arrow" size={17} />
                </button>
              </div>
            </article>
          </div>
        </section>

        <section
          className="how-section page-width"
          id="how-it-works"
          aria-labelledby="how-title"
        >
          <div className="section-heading">
            <div>
              <span className="section-kicker">
                From “what if” to “one more round”
              </span>
              <h2 id="how-title">Less setup. More play.</h2>
            </div>
          </div>
          <div className="steps-grid">
            {[
              [
                "01",
                "Set the scene",
                "A racing game on the moon? A duck with a jetpack? Tell the studio what you’re imagining.",
                "spark",
              ],
              [
                "02",
                "Find your fun",
                "Play your game, then ask for a twist. More chaos, new mechanics, a completely different world.",
                "controller",
              ],
              [
                "03",
                "Keep the adventure",
                "Tinker with the code or download your game. Your creation comes with you.",
                "download",
              ],
            ].map(([number, title, text, icon]) => (
              <div className="step" key={number}>
                <div className="step-top">
                  <Icon name={icon} size={25} />
                  <span>{number}</span>
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="closing-section page-width">
          <div>
            <span className="section-kicker">Player one, that’s you.</span>
            <h2>Go on. Make something fun.</h2>
          </div>
          <button
            className="button button-primary"
            onClick={() => onEnterStudio("2d")}
          >
            Let’s play <Icon name="play" size={18} />
          </button>
        </section>
      </main>
      <footer className="landing-footer page-width">
        <Brand />
        <p>A playground for your imagination.</p>
        <a href="#game-modes">
          Find your playground <Icon name="arrow" size={15} />
        </a>
      </footer>
    </div>
  );
}
