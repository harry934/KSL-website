import { isAbsolute } from "node:path";

const src = new URL("./src/", import.meta.url).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const file = specifier.slice(2).replace(/\.ts$/, "");
    return nextResolve(new URL(`${file}.ts`, src).href, context);
  }
  if (
    (specifier.startsWith("./") || specifier.startsWith("../") || isAbsolute(specifier)) &&
    !/\.(?:[cm]?js|ts|json|node)$/.test(specifier)
  ) {
    return nextResolve(`${specifier}.ts`, context);
  }
  return nextResolve(specifier, context);
}
