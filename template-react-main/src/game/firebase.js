import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database"; 

const firebaseConfig = {
  apiKey: "AIzaSyCC61Yf0L9_O4kSd4j0Gkoayw2-olW_SrE",
  authDomain: "officeclan.firebaseapp.com",
  databaseURL: "https://officeclan-default-rtdb.firebaseio.com",
  projectId: "officeclan",
  storageBucket: "officeclan.firebasestorage.app",
  messagingSenderId: "858275646741",
  appId: "1:858275646741:web:7ca2e993864381ab866d1c"
};

const app = initializeApp(firebaseConfig);

export const db = getDatabase(app);