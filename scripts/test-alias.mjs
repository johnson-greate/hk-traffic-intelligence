// Lets `npm test` run tests whose modules import "@/..." (the tsconfig path alias),
// the same mapping some upstream tests register for themselves.
import { register } from "node:module"

const hook = `
export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    return nextResolve(new URL("../src/" + specifier.slice(2) + ".ts", ${JSON.stringify(import.meta.url)}).href, context)
  }
  return nextResolve(specifier, context)
}
`
register(`data:text/javascript,${encodeURIComponent(hook)}`)
