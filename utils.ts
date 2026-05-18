import { createDefine } from "fresh";
import type { Lang } from "./data/lang.ts";

export interface State {
  lang: Lang;
}

export const define = createDefine<State>();
