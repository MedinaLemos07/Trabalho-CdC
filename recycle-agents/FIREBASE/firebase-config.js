// ============================================================
//  RECYCLE AGENTS — firebase-config.js
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getAuth }       from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { getFirestore }  from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyByDTdMfIvIU0cEeNS87CT6vVQsJYlwdfU",
  authDomain:        "recycle-agents-v1.firebaseapp.com",
  projectId:         "recycle-agents-v1",
  storageBucket:     "recycle-agents-v1.firebasestorage.app",
  messagingSenderId: "522661194520",
  appId:             "1:522661194520:web:de915931e9497a3590cc6d"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

export { auth, db };