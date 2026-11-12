import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxy = { '/api': { target: env.VITE_PROXY_TARGET || 'http://127.0.0.1:5000', changeOrigin: true } };
  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
      proxy,
    },
    preview: { port: 4173, strictPort: true, proxy },
    test: {
      environment: 'jsdom',
      setupFiles: ['./tests/setup.ts'],
      include: ['tests/**/*.test.{ts,tsx}'],
      clearMocks: true,
    },
  };
});
