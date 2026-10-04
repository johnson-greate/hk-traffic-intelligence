import { bindings, defineConfig, defineWorker, triggers } from "cf/config";

export default defineConfig({
  worker: defineWorker({
    name: "hktraffic",
    entrypoint: "./src/worker.ts",
    compatibilityDate: "2026-09-29",
    compatibilityFlags: ["nodejs_compat"],
    assets: { notFoundHandling: "none" },
    triggers: [triggers.scheduled({ schedule: "*/5 * * * *" })],
    env: {
      ASSETS: bindings.assets(),
      DB: bindings.d1({ name: "hktraffic-history" }),
      // Declared so each deploy keeps the values set with `wrangler secret put`.
      DEEPSEEK_API_KEY: bindings.secret(),
      ANTHROPIC_API_KEY: bindings.secret(),
      TYPESAFE_API_KEY: bindings.secret(),
      // The Worker itself, so the AI briefing can read each feed as a separate request
      // with its own subrequest and CPU limits.
      SELF: bindings.worker({ worker: "hktraffic" }),
    },
  }),
});
