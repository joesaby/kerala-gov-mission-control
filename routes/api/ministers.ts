import { define } from "../../utils.ts";
import { listMinisters } from "../../data/db.ts";

export const handler = define.handlers({
  async GET() {
    const ministers = await listMinisters();
    return Response.json(
      {
        generatedAt: new Date().toISOString(),
        count: ministers.length,
        ministers,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
        },
      },
    );
  },
});
