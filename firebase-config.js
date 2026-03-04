import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js"
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js"

const firebaseConfig = {
  apiKey: "AIzaSyDJawFJ70eu4Y3_ktRtTo-5wLcTUiRJcr4",
  authDomain: "i-cheap.firebaseapp.com",
  projectId: "i-cheap",
  storageBucket: "i-cheap.firebasestorage.app",
  messagingSenderId: "747974380579",
  appId: "1:747974380579:web:bc80b6ba4247e34c8f3596"
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

export { app, db }