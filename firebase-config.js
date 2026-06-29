/* ============================================================
   BRASIL CIENTÍFICA — Firebase Configuration
   ============================================================ */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getFirestore }  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getAuth }       from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

const firebaseConfig = {
  apiKey:            "AIzaSyDh4XAkVviWd-BzPIb0Zfz0R1n1vOLdgmw",
  authDomain:        "brasilcientifica.firebaseapp.com",
  projectId:         "brasilcientifica",
  storageBucket:     "brasilcientifica.firebasestorage.app",
  messagingSenderId: "178349670016",
  appId:             "1:178349670016:web:cc7436e2e58a6e1250b065",
  measurementId:     "G-YLY6GJKJ9P"
};

const app = initializeApp(firebaseConfig);

export const db   = getFirestore(app);
export const auth = getAuth(app);