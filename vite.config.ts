import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const isProd = mode === 'production';
  return {
    server: {
      port: 5500,
      host: '0.0.0.0',
    },
    plugins: [react()],
    // NOTE: Never expose secret API keys here — anything in `define` is
    // inlined as plaintext into the client JS bundle and visible to anyone.
    // Only expose public runtime values via VITE_ prefixed env vars.
    define: {},
    esbuild: {
      // Strip all console.* calls in production — prevents auth/wallet
      // events from leaking in browser devtools on live site.
      drop: isProd ? ['console', 'debugger'] : [],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
