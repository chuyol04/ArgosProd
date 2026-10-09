import { NextResponse } from "next/server";
import { ACTIVE_CLIENT_COOKIE } from "@/lib/clientScope";

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set("session", "", {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE !== "false",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  res.cookies.set(ACTIVE_CLIENT_COOKIE, "", {
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
