import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, OAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAdjm0Bk6rVs-Ay7LMGj-7wm2xTX6PAkms",
  authDomain: "noted-b714f.firebaseapp.com",
  projectId: "noted-b714f",
  storageBucket: "noted-b714f.firebasestorage.app",
  messagingSenderId: "904723894438",
  appId: "1:904723894438:web:7bc52d4440dfc777ce6467",
  measurementId: "G-78P89B0NKX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Export Authentication, Database, and Providers
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export const appleProvider = new OAuthProvider('apple.com');
