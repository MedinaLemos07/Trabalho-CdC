// ============================================================
//  RECYCLE AGENTS — Firebase Config
//  Substitua os valores abaixo pelas credenciais do seu projeto
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth }        from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore }   from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "COLE_SUA_API_KEY_AQUI",
  authDomain:        "COLE_SEU_AUTH_DOMAIN_AQUI",
  projectId:         "COLE_SEU_PROJECT_ID_AQUI",
  storageBucket:     "COLE_SEU_STORAGE_BUCKET_AQUI",
  messagingSenderId: "COLE_SEU_MESSAGING_SENDER_ID_AQUI",
  appId:             "COLE_SEU_APP_ID_AQUI"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db   = getFirestore(app);
