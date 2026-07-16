import { getApp, getApps, initializeApp } from 'firebase/app'
import { getDatabase, type Database } from 'firebase/database'

let database: Database | undefined

export function isFirebaseConfigured() {
  const config = useRuntimeConfig().public
  return Boolean(
    config.firebaseApiKey
    && config.firebaseAuthDomain
    && config.firebaseDatabaseUrl
    && config.firebaseProjectId
    && config.firebaseAppId,
  )
}

export function useFirebaseDatabase() {
  if (!import.meta.client) {
    throw new Error('Firebase Realtime Database is available only in the browser.')
  }
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase environment variables are not configured.')
  }
  if (database) return database

  const config = useRuntimeConfig().public
  const app = getApps().length
    ? getApp()
    : initializeApp({
        apiKey: config.firebaseApiKey,
        authDomain: config.firebaseAuthDomain,
        databaseURL: config.firebaseDatabaseUrl,
        projectId: config.firebaseProjectId,
        appId: config.firebaseAppId,
      })

  database = getDatabase(app)
  return database
}
