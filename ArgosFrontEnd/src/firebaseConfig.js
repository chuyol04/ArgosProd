//ozcabaudit\src\firebaseConfig.js
import { initializeApp, getApps } from "firebase/app";
import { getAuth, browserLocalPersistence, setPersistence } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyDvVj7N94j5971XaIfEH6JlsSh_X_ozl6Q",
    authDomain: "inspeccion-cfdf1.firebaseapp.com",
    projectId: "inspeccion-cfdf1",
    storageBucket: "inspeccion-cfdf1.firebasestorage.app",
    messagingSenderId: "703620126748",
    appId: "1:703620126748:web:2f46f450ea38cf832d27d9",
};
export const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);


export async function ensureAuthPersistence() {
    if (typeof window === "undefined") return;
    try {
        await setPersistence(auth, browserLocalPersistence);
    } catch (err) {
        if (process.env.NODE_ENV !== "production") {
            console.warn("Failed to set Firebase Auth persistence:", err);
        }
    }
}