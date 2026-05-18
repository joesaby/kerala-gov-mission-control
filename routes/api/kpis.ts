import { define } from "../../utils.ts";
import { HEADLINE_KPIS } from "../../data/kpis.ts";

export const handler = define.handlers({
  GET() {
    return Response.json(
      {
        generatedAt: new Date().toISOString(),
        count: HEADLINE_KPIS.length,
        kpis: HEADLINE_KPIS,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
        },
      },
    );
  },
});
