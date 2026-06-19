import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const DSFR_VERSION = '1.13.1';
const DSFR_CDN_BASE_URL = `https://cdn.jsdelivr.net/npm/@gouvfr/dsfr@${DSFR_VERSION}/dist`;

export default defineConfig({
  plugins: [
    react(),
    {
      apply: 'serve',
      name: 'inject-dsfr-in-dev',
      transformIndexHtml() {
        return [
          {
            attrs: {
              href: `${DSFR_CDN_BASE_URL}/dsfr.min.css`,
              rel: 'stylesheet',
            },
            injectTo: 'head',
            tag: 'link',
          },
          {
            attrs: {
              href: `${DSFR_CDN_BASE_URL}/utility/utility.min.css`,
              rel: 'stylesheet',
            },
            injectTo: 'head',
            tag: 'link',
          },
          {
            attrs: {
              src: `${DSFR_CDN_BASE_URL}/dsfr/dsfr.module.min.js`,
              type: 'module',
            },
            injectTo: 'body',
            tag: 'script',
          },
          {
            attrs: {
              nomodule: true,
              src: `${DSFR_CDN_BASE_URL}/dsfr/dsfr.nomodule.min.js`,
              type: 'text/javascript',
            },
            injectTo: 'body',
            tag: 'script',
          },
        ];
      },
    },
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@root': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
});
