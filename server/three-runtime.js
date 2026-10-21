import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import { rolldown } from 'rolldown';
import { createThreeRuntime } from '../src/lib/preview.js';

let runtime;
export function bundleThreeRuntime() {
  runtime ??= (async () => {
    const directory = dirname(createRequire(import.meta.url).resolve('three'));
    const bundle = await rolldown({ input: resolve(directory, 'three.module.js'), platform: 'browser' });
    try {
      const { output } = await bundle.generate({ format: 'iife', name: 'THREE', minify: true });
      const license = await readFile(resolve(directory, '../LICENSE'), 'utf8');
      return createThreeRuntime(output.find((item) => item.type === 'chunk').code, license);
    } finally {
      await bundle.close();
    }
  })();
  return runtime;
}

export default function threeRuntimePlugin() {
  const id = '\0vibestudio-three-runtime';
  return {
    name: 'vibestudio-three-runtime',
    resolveId(source) {
      if (source === 'virtual:vibestudio-three') return id;
    },
    async load(source) {
      if (source === id) return 'export default ' + JSON.stringify(await bundleThreeRuntime()) + ';';
    },
  };
}
