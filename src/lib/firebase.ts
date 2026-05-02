import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(
  app,
  import.meta.env.VITE_FIREBASE_DATABASE_ID || '(default)',
)
export const auth = getAuth(app)

async function testConnection() {
  try {
    // Just a heartbeat to check connectivity
    await getDocFromServer(doc(db, 'system', 'heartbeat'))
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.error('Please check your Firebase configuration.')
    }
  }
}

testConnection()
