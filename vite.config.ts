import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig, type PluginOption } from 'vite';

const DSFR_VERSION = '1.13.1';
const DSFR_CDN_BASE_URL = `https://cdn.jsdelivr.net/npm/@gouvfr/dsfr@${DSFR_VERSION}/dist`;
const BUILD_MODES = {
  demo: {
    apiBaseUrl: 'https://france-chaleur-urbaine-dev-pr1255.osc-fr1.scalingo.io',
    hasDsfr: true,
  },
  dev: {
    apiBaseUrl: 'http://localhost:3000',
    hasDsfr: true,
  },
  prod: {
    apiBaseUrl: 'https://france-chaleur-urbaine.beta.gouv.fr',
    hasDsfr: false,
  },
} as const;

export default defineConfig(({ mode }) => {
  const buildMode = getBuildMode(mode);
  const buildConfig = BUILD_MODES[buildMode];

  return {
    build: {
      assetsInlineLimit: 20 * 1024,
    },
    define: {
      'import.meta.env.VITE_FCU_API_BASE_URL': JSON.stringify(buildConfig.apiBaseUrl),
    },
    plugins: [react(), buildConfig.hasDsfr ? createDsfrPlugin() : undefined],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@root': fileURLToPath(new URL('.', import.meta.url)),
      },
    },
  };
});

function getBuildMode(mode: string) {
  return mode === 'demo' || mode === 'dev' ? mode : 'prod';
}

function createDsfrPlugin(): PluginOption {
  return {
    name: 'inject-dsfr',
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
  };
}
