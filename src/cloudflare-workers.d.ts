// Provided by workerd at runtime. Only the bindings this app reads are typed.
declare module "cloudflare:workers" {
  export const env: Record<string, unknown>
  export function waitUntil(promise: Promise<unknown>): void
}
