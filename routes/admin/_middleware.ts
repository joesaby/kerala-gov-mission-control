import { define } from "../../utils.ts";

/**
 * HTTP Basic Auth gate for everything under /admin (pages + API).
 *
 * Username is fixed to `admin`; the password is `ADMIN_PASSWORD` from the
 * environment. The area is unlinked and marked noindex — it is hidden, not
 * public. If `ADMIN_PASSWORD` is unset the area is disabled (503) rather than
 * left open.
 */

// Must be ASCII — HTTP header values are ByteStrings (no em dashes, etc.).
const REALM = "Kerala Mission Control Admin";

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function unauthorized(): Response {
  return new Response("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${REALM}", charset="UTF-8"`,
      "X-Robots-Tag": "noindex, nofollow",
      "Cache-Control": "no-store",
    },
  });
}

export default define.middleware((ctx) => {
  const expected = Deno.env.get("ADMIN_PASSWORD");
  if (!expected) {
    return new Response(
      "Admin area is disabled (ADMIN_PASSWORD is not set).",
      { status: 503, headers: { "X-Robots-Tag": "noindex, nofollow" } },
    );
  }

  const header = ctx.req.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return unauthorized();

  let decoded: string;
  try {
    decoded = atob(header.slice(6));
  } catch {
    return unauthorized();
  }
  const sep = decoded.indexOf(":");
  if (sep === -1) return unauthorized();
  const user = decoded.slice(0, sep);
  const pass = decoded.slice(sep + 1);

  if (user !== "admin" || !constantTimeEqual(pass, expected)) {
    return unauthorized();
  }

  return ctx.next();
});
