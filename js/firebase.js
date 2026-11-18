// js/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAKgvAdG0khyPt0K-InRwVrsyDJ-UbnX9U",
  authDomain: "paleta-onboarding.firebaseapp.com",
  projectId: "paleta-onboarding",
  storageBucket: "paleta-onboarding.firebasestorage.app",
  messagingSenderId: "1004310882844",
  appId: "1:1004310882844:web:cbb0c4b71be435eef14dd9"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export { firebaseConfig };
