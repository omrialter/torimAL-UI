// firebase-config.js
import Constants from "expo-constants";
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// אם אתה לא משתמש ב-apiUrl אפשר גם למחוק את השורה הזו
// const apiUrl = Constants.expoConfig?.extra?.API_URL;

const firebaseConfig = {
    apiKey: Constants.expoConfig?.extra?.FIREBASE_API_KEY,
    authDomain: Constants.expoConfig?.extra?.FIREBASE_AUTH_DOMAIN,
    projectId: Constants.expoConfig?.extra?.FIREBASE_PROJECT_ID,
    storageBucket: Constants.expoConfig?.extra?.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: Constants.expoConfig?.extra?.FIREBASE_MESSAGING_SENDER_ID,
    appId: Constants.expoConfig?.extra?.FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { auth };

