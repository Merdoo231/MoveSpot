// firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAAJrZbO8SnomtQCqGSg-3GE0wdiQZ2Tuk",
  authDomain: "movespot-e56e9.firebaseapp.com",
  projectId: "movespot-e56e9",
  storageBucket: "movespot-e56e9.appspot.com", 
  messagingSenderId: "241725852304",
  appId: "1:241725852304:web:b17fad0ad0e17e2995a615",
  measurementId: "G-QDC51GFEF9",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);