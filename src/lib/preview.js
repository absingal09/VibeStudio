const BRIDGE = `window.addEventListener('error', function(event) {
  parent.postMessage({ type: 'vibestudio-preview-error', message: event.message || 'The game could not start.' }, '*');
});
window.addEventListener('unhandledrejection', function(event) {
  parent.postMessage({ type: 'vibestudio-preview-error', message: String(event.reason && event.reason.message || event.reason || 'The game could not start.') }, '*');
});`;

export function createThreeRuntime(source, license) {
  return `/* Three.js — ${license.replaceAll('*/', '* /')} */\n${source}\nwindow.THREE = THREE;`;
}

function script(source, name) {
  return `<script data-vibestudio-runtime="${name}">${source.replace(/<\/script/gi, '<\\/script')}</script>`;
}

export function buildPlayableDocument(html, mode, threeRuntime = '') {
  if (mode === '3d' && !threeRuntime) throw new Error('The 3D engine is still loading. Please try again.');
  const clean = html.replace(/<script\b[^>]*data-vibestudio-runtime=["'](?:three|errors)["'][^>]*>[\s\S]*?<\/script\s*>/gi, '');
  const scripts = script(BRIDGE, 'errors') + (mode === '3d' ? script(threeRuntime, 'three') : '');
  if (/<head\b[^>]*>/i.test(clean)) return clean.replace(/<head\b[^>]*>/i, (head) => head + scripts);
  if (/<html\b[^>]*>/i.test(clean)) return clean.replace(/<html\b[^>]*>/i, (root) => root + '<head>' + scripts + '</head>');
  return scripts + clean;
}
