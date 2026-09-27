// Cosmos Arogya — Firebase (Auth + Firestore)
//
// SETUP REQUIRED before this works:
// 1. Go to https://console.firebase.google.com → Create project "Cosmos Arogya"
// 2. Build > Authentication > Sign-in method > enable "Google"
// 3. Build > Firestore Database > Create database (start in production mode)
// 4. Project settings > General > "Your apps" > Add app > Web (</>) > copy the config below
// 5. Firestore > Rules, paste:
//      rules_version = '2';
//      service cloud.firestore {
//        match /databases/{database}/documents {
//          match /users/{userId} {
//            allow read, write: if request.auth != null && request.auth.uid == userId;
//          }
//        }
//      }
// 6. Authentication > Settings > Authorized domains > add your Vercel domain

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc, updateDoc, arrayUnion, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// ⚠️ Replace with YOUR Firebase project's config (Project settings > General)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

/** Opens the Google sign-in popup and creates a Firestore profile on first login. */
export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    await setDoc(userRef, {
      name: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      createdAt: serverTimestamp(),
      savedPlaces: [],
      scanHistory: []
    });
  }
  return user;
}

export function signOutUser() {
  return signOut(auth);
}

/** callback(user | null) fires on load and on every sign-in/sign-out. */
export function watchAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function getUserData(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

/** Save a hospital/pharmacy the user found, to their profile. */
export async function savePlaceForUser(uid, place) {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, { savedPlaces: arrayUnion(place) });
}

/** Save a scan result (medicine/report) to the user's history — used from Phase 3 onward. */
export async function saveScanForUser(uid, scan) {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, {
    scanHistory: arrayUnion({ ...scan, savedAt: new Date().toISOString() })
  });
}
