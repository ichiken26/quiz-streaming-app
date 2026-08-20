// https://nuxt.com/docs/api/configuration/nuxt-config
const localWorkerPort = Number(process.env.LOCAL_WORKER_PORT ?? 8787)
const localWorkerUrl = process.env.LOCAL_WORKER_URL ?? `http://127.0.0.1:${localWorkerPort}`
const localAdminEmail = process.env.LOCAL_ADMIN_EMAIL ?? '62ichiken@gmail.com'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  // Static Assets + Worker SPA fallback: deep links must hydrate as a client router.
  // SSG HTML for `/` would otherwise force the landing route when `/room/...` is opened directly.
  ssr: false,
  extends: [
    './layers/streaming',
    './layers/quiz',
    './layers/realtime',
  ],
  devtools: { enabled: true },
  css: ['~/assets/css/main.css', '~/assets/css/admin-validation.css'],
  vite: {
    server: {
      proxy: {
        '/api': {
          target: localWorkerUrl,
          changeOrigin: true,
          headers: {
            'cf-access-authenticated-user-email': localAdminEmail,
          },
        },
        '/slides': {
          target: localWorkerUrl,
          changeOrigin: true,
          headers: {
            'cf-access-authenticated-user-email': localAdminEmail,
          },
        },
      },
    },
  },
  runtimeConfig: {
    public: {
      firebaseApiKey: '',
      firebaseAuthDomain: '',
      firebaseDatabaseUrl: '',
      firebaseProjectId: '',
      firebaseAppId: '',
    },
  },
  nitro: {
    prerender: {
      crawlLinks: false,
      routes: ['/'],
    },
  },
})
