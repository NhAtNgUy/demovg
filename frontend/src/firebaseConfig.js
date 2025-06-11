import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBK7RgccyYpJ2GoiQkwIiBYtHYrKbfu1Y8",
    authDomain: "kcms-64137.firebaseapp.com",
    projectId: "kcms-64137",
    storageBucket: "kcms-64137.firebasestorage.app",
    messagingSenderId: "488142366147",
    appId: "1:488142366147:web:5f962c1c7f1b8621834976",
    measurementId: "G-LV315M3NFV"
  };

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);