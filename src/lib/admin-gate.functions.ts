// Passcode-based admin gate. ADMIN_PASSCODE must be configured as a server-only
// deployment secret. Never ship a known fallback credential in source control.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({ passcode: z.string().min(1).max(200) });

function timingSafeEq(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export function checkAdminPasscode(pass: string | undefined | null): boolean {
  const expected = process.env.ADMIN_PASSCODE;
  // Fail closed: a missing server secret must never expose a predictable admin login.
  if (!pass || !expected) return false;
  return timingSafeEq(pass, expected);
}

export const verifyAdminPasscode = createServerFn({ method: "POST" })
  .inputValidator((d) => schema.parse(d))
  .handler(async ({ data }) => {
    const ok = checkAdminPasscode(data.passcode);
    return { ok };
  });
