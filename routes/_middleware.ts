import { define } from "../utils.ts";
import { readLangFromRequest } from "../data/lang.ts";

export default define.middleware((ctx) => {
  ctx.state.lang = readLangFromRequest(ctx.req);
  return ctx.next();
});
