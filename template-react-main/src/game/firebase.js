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

const firebaseDevConfig = {
  apiKey: "AIzaSyCrZfUtdJ_GDAmuYwrYEQObMp8nQ15ipDc",
  authDomain: "officeclan-dev.firebaseapp.com",
  projectId: "officeclan-dev",
  storageBucket: "officeclan-dev.firebasestorage.app",
  messagingSenderId: "400302452634",
  appId: "1:400302452634:web:415802303bb89012f15423"
};

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const app = initializeApp(isLocalhost ? firebaseDevConfig : firebaseConfig);

export const db = getDatabase(app);