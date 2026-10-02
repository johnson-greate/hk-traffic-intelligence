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
    },
  }),
});
