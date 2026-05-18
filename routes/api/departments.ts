import { define } from "../../utils.ts";
import { listDepartments } from "../../data/db.ts";

export const handler = define.handlers({
  async GET() {
    const depts = await listDepartments();
    return Response.json(
      {
        generatedAt: new Date().toISOString(),
        count: depts.length,
        departments: depts,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
        },
      },
    );
  },
});
