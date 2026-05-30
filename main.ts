import { App, staticFiles, trailingSlashes } from "fresh";
import { type State } from "./utils.ts";
import { registerIngestCron } from "./lib/cron.ts";

// Daily Government Order ingest (no-ops without Deno.cron + GEMINI_API_KEY).
registerIngestCron();

export const app = new App<State>()
  .use(staticFiles())
  .use(trailingSlashes("never"));

app.fsRoutes();
