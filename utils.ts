import { createDefine } from "fresh";
import type { Lang } from "./data/lang.ts";

export interface State {
  lang: Lang;
  /** Request pathname, set by the root middleware — used to highlight nav. */
  path: string;
}

export const define = createDefine<State>();
