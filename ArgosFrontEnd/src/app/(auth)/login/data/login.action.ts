"use server";

import * as admin from "firebase-admin";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Initialize Firebase Admin once
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON as string)
    ),
    projectId: process.env.FIREBASE_PROJECT_ID || undefined,
  });
}

const SESSION_MAX_AGE_MS = Number(
  process.env.FB_SESSION_MAX_AGE_MS || 1 * 60 * 60 * 1000
);
const EXPRESS_BASE_URL = process.env.EXPRESS_BASE_URL || "";

export async function loginAction(
  email: string,
  password: string
): Promise<{ success: false; error: string }> {
  if (!EXPRESS_BASE_URL) {
    return { success: false, error: "Server configuration error" };
  }
  if (!email || !password) {
    return { success: false, error: "Email y contraseña son requeridos" };
  }

  // Determined inside the try block, used for the redirect AFTER it (next/navigation's
  // redirect() throws a control-flow exception that must never be caught).
  let destination = "/home";

  try {
    const res = await fetch(`${EXPRESS_BASE_URL}/login/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err?.motive || "Credenciales inválidas" };
    }

    const payload = await res.json();
    const idToken = payload?.firebaseAccess?.value?.idToken;

    if (!idToken) {
      return { success: false, error: "Error de autenticación" };
    }

    const sessionCookie = await admin.auth().createSessionCookie(idToken, {
      expiresIn: SESSION_MAX_AGE_MS,
    });

    const cookieStore = await cookies();
    cookieStore.set("session", sessionCookie, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE !== "false",
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(SESSION_MAX_AGE_MS / 1000),
    });

    // Client-portal users land on their own read-only section instead of /home.
    try {
      const detailsRes = await fetch(`${EXPRESS_BASE_URL}/users/details`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: `session=${sessionCookie}` },
        cache: "no-store",
      });
      if (detailsRes.ok) {
        const { success, user } = await detailsRes.json();
        if (success && Array.isArray(user?.roles) && user.roles.includes("Cliente")) {
          destination = "/mis-reportes";
        }
      }
    } catch (error) {
      console.error("Login role lookup error (defaulting to /home):", error);
    }
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, error: "Error procesando autenticación" };
  }

  // Redirect on success - this throws internally, never returns. Must be
  // outside any try/catch above so its control-flow exception isn't swallowed.
  redirect(destination);
}
