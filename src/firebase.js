import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCfyBmYkq4GmcZ8zIvgdoGw5260_6L9H5E",
  authDomain: "gestionale-nautico.firebaseapp.com",
  projectId: "gestionale-nautico",
  storageBucket: "gestionale-nautico.firebasestorage.app",
  messagingSenderId: "356589379344",
  appId: "1:356589379344:web:030d75930b8bca2f000f95"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);