#!/usr/bin/env -S deno run -A --watch=static/,routes/,components/,data/,islands/

import { Builder } from "fresh/dev";
import { tailwind } from "@fresh/plugin-tailwind";

const builder = new Builder();
tailwind(builder);

if (Deno.args.includes("build")) {
  await builder.build();
} else {
  await builder.listen(() => import("./main.ts"));
}
