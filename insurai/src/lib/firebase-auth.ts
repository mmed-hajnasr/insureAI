import { getApp, getApps, initializeApp } from "firebase/app"
import {
    type Auth,
    type User,
    GoogleAuthProvider,
    createUserWithEmailAndPassword,
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut,
} from "firebase/auth"

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const isFirebaseConfigured = Object.values(firebaseConfig).every(
    (value) => typeof value === "string" && value.trim().length > 0
)

let auth: Auth | null = null
let googleProvider: GoogleAuthProvider | null = null

if (isFirebaseConfigured) {
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
    auth = getAuth(app)
    googleProvider = new GoogleAuthProvider()
}

function ensureAuth() {
    if (!auth) {
        throw new Error(
            "Firebase authentication is not configured. Add all VITE_FIREBASE_* variables to your .env file."
        )
    }

    return auth
}

export function observeAuthState(callback: (user: User | null) => void) {
    if (!auth) {
        callback(null)
        return () => undefined
    }

    return onAuthStateChanged(auth, callback)
}

export async function signInWithEmailPassword(email: string, password: string) {
    const authInstance = ensureAuth()
    const credentials = await signInWithEmailAndPassword(authInstance, email, password)

    return credentials.user
}

export async function signUpWithEmailPassword(email: string, password: string) {
    const authInstance = ensureAuth()
    const credentials = await createUserWithEmailAndPassword(authInstance, email, password)

    return credentials.user
}

export async function signInWithGoogleProvider() {
    const authInstance = ensureAuth()

    if (!googleProvider) {
        throw new Error("Google sign-in provider is unavailable.")
    }

    const credentials = await signInWithPopup(authInstance, googleProvider)
    return credentials.user
}

export async function signOutCurrentUser() {
    const authInstance = ensureAuth()
    await signOut(authInstance)
}

export function mapFirebaseAuthError(error: unknown) {
    if (!(error instanceof Error)) {
        return "Authentication failed. Please try again."
    }

    if (error.message.includes("Firebase authentication is not configured")) {
        return error.message
    }

    const code = (error as { code?: string }).code

    switch (code) {
        case "auth/configuration-not-found":
            return "Firebase Auth configuration is missing. In Firebase Console, enable Authentication and turn on Email/Password and/or Google provider."
        case "auth/operation-not-allowed":
            return "This sign-in method is disabled in Firebase Console. Enable the provider in Authentication → Sign-in method."
        case "auth/unauthorized-domain":
            return "This domain is not authorized for Firebase Auth. Add it in Authentication → Settings → Authorized domains."
        case "auth/invalid-email":
            return "Please enter a valid email address."
        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/user-not-found":
            return "Incorrect email or password."
        case "auth/email-already-in-use":
            return "This email is already registered."
        case "auth/weak-password":
            return "Password is too weak. Use at least 6 characters."
        case "auth/popup-closed-by-user":
            return "Google sign-in was canceled."
        case "auth/network-request-failed":
            return "Network error. Please check your connection and try again."
        default:
            return error.message || "Authentication failed. Please try again."
    }
}

export { isFirebaseConfigured }