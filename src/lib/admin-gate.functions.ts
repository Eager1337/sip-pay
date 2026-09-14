// Passcode-based admin gate. The passcode ("Eagerbeaver123" by default) is
// stored in the ADMIN_PASSCODE secret and checked server-side on every call.
// Client persists the passcode in sessionStorage after successful verify.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({ passcode: z.string().min(1).max(200) });

function timingSafeEq(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export const DEFAULT_ADMIN_PASSCODE = "Eagerbeaver123";

export function checkAdminPasscode(pass: string | undefined | null): boolean {
  // Falls back to a built-in passcode when ADMIN_PASSCODE is not configured,
  // so the admin dashboard works out-of-the-box on any deploy (Vercel, etc.)
  // without first setting the environment secret. Set ADMIN_PASSCODE to override.
  const expected = process.env.ADMIN_PASSCODE || DEFAULT_ADMIN_PASSCODE;
  if (!pass) return false;
  return timingSafeEq(pass, expected);
}

export const verifyAdminPasscode = createServerFn({ method: "POST" })
  .inputValidator((d) => schema.parse(d))
  .handler(async ({ data }) => {
    const ok = checkAdminPasscode(data.passcode);
    return { ok };
  });
