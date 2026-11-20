import { defineConfig, Plugin } from 'vite';
import { resolve } from 'path';

/** Lists the built scripts and styles, so the service worker can cache the app on install. */
function precacheList(): Plugin {
  return {
    name: 'precache-list',
    apply: 'build',
    generateBundle(_options, bundle) {
      const files = Object.keys(bundle).filter(name => /\.(js|css|html)$/.test(name)).map(name => `/${name}`);
      this.emitFile({ type: 'asset', fileName: 'precache.json', source: JSON.stringify(files) });
    },
  };
}

export default defineConfig({
  plugins: [precacheList()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
  },
});
