import { register } from "node:module";

register(new URL("./test-hooks.mjs", import.meta.url).href, import.meta.url);
