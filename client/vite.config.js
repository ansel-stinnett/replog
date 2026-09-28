import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the client proxies /api to the Express server, so the
// session cookie is same-origin and no CORS setup is needed.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:3001' },
  },
});
