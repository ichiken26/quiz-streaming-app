// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  extends: [
    './layers/streaming',
    './layers/quiz',
    './layers/realtime',
  ],
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
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
      routes: [
        '/room/2026_GD_welcomeParty',
        '/admin/room/2026_GD_welcomeParty',
      ],
    },
  },
})
