import { define } from "../../../utils.ts";

// Appointments have been merged into the combined Orders page as a tab.
// Redirect any old links / bookmarks to the appointments tab there.
export const handler = define.handlers({
  GET() {
    return new Response(null, {
      status: 307,
      headers: { location: "/gov/orders#appointments" },
    });
  },
});
