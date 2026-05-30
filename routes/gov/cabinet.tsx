import { define } from "../../utils.ts";

// Cabinet has been merged into the Government hub (/gov). Redirect any old
// links / bookmarks to the cabinet section of the merged page.
export const handler = define.handlers({
  GET(ctx) {
    const slug = new URL(ctx.req.url).searchParams.get("g");
    const location = slug ? `/gov?g=${slug}#cabinet` : "/gov#cabinet";
    return new Response(null, { status: 307, headers: { location } });
  },
});
