import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { runInNewContext, Script } from 'node:vm';
import { buildGenerationRequest, createWorkspace, EMPTY_GAME, getMode, hasGameCode } from '../src/lib/game-modes.js';
import { buildPlayableDocument } from '../src/lib/preview.js';
import { bundleThreeRuntime } from '../server/three-runtime.js';

test('2D and 3D requests have distinct rendering requirements for generation and refinement', () => {
  const two = buildGenerationRequest('2d', 'Make a pinball game', EMPTY_GAME);
  assert.match(two.prompt, /Create a 2D browser game/);
  assert.match(two.systemPrompt, /HTML5 Canvas/);
  assert.match(two.systemPrompt, /Pure vanilla JavaScript/);
  const three = buildGenerationRequest('3d', 'Build a racing game', EMPTY_GAME);
  assert.match(three.prompt, /Create a 3D browser game/);
  assert.match(three.systemPrompt, /window\.THREE/);
  assert.match(three.systemPrompt, /THREE\.WebGLRenderer/);
  assert.match(three.systemPrompt, /Never add imports/);
  const refinement = buildGenerationRequest('3d', 'Add bridges', '<html>Existing 3D world</html>');
  assert.match(refinement.prompt, /current 3D game code/);
  assert.match(refinement.prompt, /Existing 3D world/);
  assert.match(refinement.systemPrompt, /Keep genuine Three\.js 3D rendering/);
});

test('workspaces start with independent code, prompts, and suggestions', () => {
  const two = createWorkspace('2d');
  const three = createWorkspace('3d', '<html>Starter world</html>');
  assert.equal(hasGameCode(two.code), false);
  assert.equal(hasGameCode(three.code), true);
  three.input = 'Add a tree';
  three.messages.push({ role: 'user', content: 'Add a tree' });
  assert.equal(two.input, '');
  assert.equal(two.messages.length, 1);
  assert.match(getMode('3d').welcome, /3D sandbox/);
  assert.notDeepEqual(getMode('3d').suggestions, getMode('2d').suggestions);
  assert.equal(getMode('unknown').id, '2d');
});

test('3D exports contain the actual bundled engine and run without imports or a CDN', { timeout: 30_000 }, async () => {
  const runtime = await bundleThreeRuntime();
  const context = { window: {}, console };
  runInNewContext(runtime, context, { timeout: 10_000 });
  const THREE = context.window.THREE;
  assert.match(THREE.REVISION, /^186/);
  const scene = new THREE.Scene();
  scene.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial()));
  assert.equal(scene.children[0].geometry.type, 'BoxGeometry');
  const html = '<!doctype html><html><head><title>Game</title></head><body><script>const scene = new THREE.Scene();</script></body></html>';
  const exported = buildPlayableDocument(html, '3d', runtime);
  assert.ok(exported.indexOf('window.THREE = THREE') < exported.indexOf('const scene = new THREE.Scene()'));
  assert.match(exported, /Copyright.*Three\.js Authors/);
  assert.doesNotMatch(exported, /<script[^>]+src=/i);
  assert.equal((buildPlayableDocument(exported, '3d', runtime).match(/data-vibestudio-runtime="three"/g) || []).length, 1);
});

test('2D documents stay engine-free; 3D cannot export before its engine is ready', () => {
  const html = '<html><body><canvas></canvas></body></html>';
  const two = buildPlayableDocument(html, '2d');
  assert.match(two, /<canvas>/);
  assert.doesNotMatch(two, /data-vibestudio-runtime="three"/);
  assert.throws(() => buildPlayableDocument(html, '3d'), /engine is still loading/);
  const escaped = buildPlayableDocument('<html></html>', '3d', 'window.test = "</script>";');
  assert.match(escaped, /window\.test = "<\\\/script>"/);
});

test('the playable starter has valid JavaScript, movement, orbit controls, scoring and restart', async () => {
  const html = await readFile(new URL('../src/templates/three-starter.html', import.meta.url), 'utf8');
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 1);
  new Script(scripts[0][1]);
  for (const requirement of ['THREE.WebGLRenderer', 'THREE.PerspectiveCamera', 'requestAnimationFrame', 'pointermove', 'keydown', 'score===12', "addEventListener('click',reset)"]) {
    assert.ok(html.includes(requirement), requirement);
  }
  assert.doesNotMatch(html, /https?:\/\/|<script[^>]+src=/);
});
