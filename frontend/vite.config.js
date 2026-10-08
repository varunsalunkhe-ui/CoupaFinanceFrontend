import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Backend origin the dev server proxies '/api' requests to. Set
  // VITE_DEV_PROXY_TARGET in your local .env (see .env.example) — never
  // hardcode an environment-specific URL here.
  const proxyTarget = env.VITE_DEV_PROXY_TARGET || 'http://localhost:8080'

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, ''),
          // server.headers below is never applied to proxied responses (http-proxy
          // pipes the upstream's raw headers through) — set them here instead.
          configure: (proxy) => {
            proxy.on('proxyRes', (proxyRes) => {
              proxyRes.headers['x-frame-options'] = 'DENY';
              proxyRes.headers['x-content-type-options'] = 'nosniff';
              proxyRes.headers['referrer-policy'] = 'strict-origin-when-cross-origin';
              proxyRes.headers['permissions-policy'] = 'geolocation=(), microphone=(), camera=(), payment=(), usb=()';
              proxyRes.headers['x-xss-protection'] = '1; mode=block';
            });
          },
        },
      },
      // Dev-only parity with nginx.conf.template's production security headers
      // (Vite's dev server never reads that file) so header checks also work locally.
      headers: {
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=(), usb=()',
        'X-XSS-Protection': '1; mode=block',
      },
    },
  }
})
