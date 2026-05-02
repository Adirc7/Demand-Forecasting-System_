import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: "demand-forecasting-syste-7098b.firebaseapp.com",
    projectId: "demand-forecasting-syste-7098b",
    storageBucket: "demand-forecasting-syste-7098b.firebasestorage.app",
    messagingSenderId: "134828428757",
    appId: "1:134828428757:web:5494b3981ea1195286415c"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
