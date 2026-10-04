<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Live site

The live worker is built only from `main`. Run `npm run deploy:vinext`. It refuses another branch, a dirty tree, a commit that is not `origin/main`, and a side branch that is missing from `docs/branches.md`.

## Branches

Side branches are allowed. Every branch on `origin` or `github` other than `main` has one row in `docs/branches.md` saying what it is. Add the row when the branch is pushed. Remove the row when the branch is deleted. `node scripts/branch-register.mjs` prints whether the list matches the remotes.

## The board

One shared reading serves every visitor. Cache it. A new feature that needs its own database, cron archive, or model is the wrong feature.

- Road colour is the Transport Department saturation class. Where that class is missing, the colour falls back to the live speed. Do not store speeds to invent a second "slower than usual."
- The three harbour times on the bar come from the one sign nearest the map. Do not add another card with different minutes. Do not remember the chosen sign in the browser.
- Ask arrival clocks only for stops the map is showing, through the shared polite queue. Do not ask for clocks for saved stops, or for stops off screen, when the page opens.
- A hung or slow request is fixed in our code. Do not hide it with a database, a snapshot cron, or a larger CPU limit.
- Do not add a language model, push alerts, a rain-radar layer, or a sky decoration. The numbers already on the board are the product.

## Jev

Jev is TypeSafe's System One model. It does not write code or choose the next step. When a judgment is semantic and you are not sure, ask Jev, then act on the typed answer. Keep arithmetic, lookups, control flow, and side effects in code.

Read `.cursor/skills/typesafe-ai/SKILL.md` and the live page for the primitive you are about to use before writing a new request. Live docs override the vendored skill: https://docs.typesafe.ai/llms.txt

Ask with `node scripts/ask-jev.mjs request.json`. The script posts `state`, `model`, and `questions`. With `TYPESAFE_API_KEY` (read from the shell or `.env`) it calls TypeSafe directly at `https://api.typesafe.ai/v1/systemone` with model `jev-latest`; otherwise it calls `https://openrouter.ai/api/alpha/decisions` with `OPENROUTER_API_KEY` and model `~typesafe/jev-latest` (https://openrouter.ai/~typesafe/jev-latest). It does not rewrite questions.

Shape the request like this:

- Put only the relevant facts in `state`. Use JSON when there are several parts, and point a question at a field with a backticked path such as `` `ticket.message` ``.
- One narrow judgment per question. Ask independent questions in the same request, including ones that matter only on some branches.
- `choice` selects one option from criteria you define. Add a none or other option when the set may not cover the case. `confidence` says how peaked the distribution is, not whether the whole workflow is correct.
- `score` places the state on ordered levels. Each level must describe a concrete situation.
- `noul` is the probability the statement is true. A value near 0.5 means yes and no are about equally likely. It is not a medium amount of the thing being judged.
- Question ids are for the caller. The model does not see them, so the full question belongs in `instructions`.
- Do not lead the question, drop a competing option, or tighten criteria to push a preferred answer.
- A second request is for when the first answer changes the evidence or the options. Otherwise combine answers in code.
- On a consequential action, an uncertain noul or a flat choice distribution means get more evidence or ask the user. Do not treat that answer as settled. Thresholds are part of the decision and belong next to the questions.
