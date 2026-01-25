import { initializeApp, cert, getApps, type App } from "firebase-admin/app";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";

let app: App;

// Initialize Firebase Admin SDK
function getFirebaseAdmin(): App {
    if (getApps().length === 0) {
        // For local development, use service account credentials from environment
        const projectId = process.env.FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

        if (!projectId || !clientEmail || !privateKey) {
            throw new Error(
                "Firebase Admin SDK credentials are missing. " +
                "Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY environment variables."
            );
        }

        app = initializeApp({
            credential: cert({
                projectId,
                clientEmail,
                privateKey,
            }),
        });
    } else {
        app = getApps()[0];
    }
    return app;
}

/**
 * Verify a Firebase ID token and return the decoded token
 */
export async function verifyIdToken(idToken: string): Promise<DecodedIdToken> {
    const admin = getFirebaseAdmin();
    return getAuth(admin).verifyIdToken(idToken);
}

/**
 * Get Firebase user info from ID token
 */
export async function getFirebaseUser(idToken: string) {
    const decodedToken = await verifyIdToken(idToken);
    return {
        uid: decodedToken.uid,
        email: decodedToken.email || null,
        name: decodedToken.name || null,
        picture: decodedToken.picture || null,
    };
}

export { getFirebaseAdmin };
