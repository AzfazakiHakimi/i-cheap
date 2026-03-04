import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js"
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js"

const firebaseConfig = {
  apiKey: "ISI_API_KEY",
  authDomain: "ISI_AUTH_DOMAIN",
  projectId: "ISI_PROJECT_ID",
  storageBucket: "ISI_STORAGE_BUCKET",
  messagingSenderId: "ISI_MESSAGING_SENDER_ID",
  appId: "ISI_APP_ID"
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

export { app, db }