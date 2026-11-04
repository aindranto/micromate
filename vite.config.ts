import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        // Prompt strategy: a new service worker never reloads the page on
        // its own. main.tsx forwards onNeedRefresh to App.tsx, which shows
        // a banner and lets the user reload when the sync queue is clear.
        registerType: 'prompt',
        includeAssets: ['favicon.svg', 'icons/*.png'],
        manifest: {
          name: 'MicroMate',
          short_name: 'MicroMate',
          description:
            'Personal Asset & Maintenance Manager. Kelola aset, servis, pengingat, dan dokumen dalam satu tempat, bisa dipakai offline.',
          lang: 'id',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          theme_color: '#064e3b',
          background_color: '#f8fafc',
          icons: [
            {
              src: '/icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/icons/icon-maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          // App shell only. index.html is precached with a revision hash,
          // so a stale index.html cannot point at a deleted bundle.
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
          navigateFallback: 'index.html',
          runtimeCaching: [
            {
              // Never cache API traffic: Apps Script, the /api proxy, and
              // Google Drive files must always be fresh. Caching them could
              // show stale assets, documents, or sync state.
              urlPattern: /^https:\/\/script\.google\.com\/.*/i,
              handler: 'NetworkOnly',
            },
            {
              urlPattern: /\/api\//,
              handler: 'NetworkOnly',
            },
            {
              urlPattern: /^https:\/\/(drive|docs)\.google\.com\/.*/i,
              handler: 'NetworkOnly',
            },
          ],
        },
        devOptions: {
          // Keep the service worker out of dev so `npm run dev` (Vite
          // middleware via server.ts) is never confused with a PWA build.
          enabled: false,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      chunkSizeWarningLimit: 1600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('lucide-react')) {
                return 'lucide-vendor';
              }
              if (id.includes('@mui') || id.includes('@emotion')) {
                return 'mui-vendor';
              }
              if (id.includes('motion')) {
                return 'motion-vendor';
              }
              if (id.includes('react')) {
                return 'react-vendor';
              }
              return 'vendor';
            }
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify — file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
