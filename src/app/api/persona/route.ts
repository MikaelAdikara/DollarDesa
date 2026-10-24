import type { NextRequest } from "next/server";
import { z } from "zod";
import { PERSONAS } from "@/lib/server/context";
import { ok, zodFail } from "@/lib/server/http";

const Body = z.object({ role: z.enum(["sppg", "sekolah", "dinas", "bgn"]) });

/**
 * POST /api/persona — demo sign-in. In production this is replaced by SIPGN SSO;
 * the role claim comes from the identity provider, not from the client.
 */
export async function POST(req: NextRequest) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return zodFail(body.error);
  const res = ok(PERSONAS[body.data.role]);
  res.cookies.set("detak_role", body.data.role, { path: "/", sameSite: "lax", httpOnly: true, maxAge: 60 * 60 * 8 });
  return res;
}
