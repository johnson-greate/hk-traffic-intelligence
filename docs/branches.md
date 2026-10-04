# Branches

The live site is built only from `main`. `npm run deploy:vinext` refuses any other branch, a dirty tree, and a commit that is not `origin/main`.

A side branch is allowed only while it has a row in the table. Add the row when the branch is pushed. Remove the row when the branch is deleted. A deploy also refuses to run while this table and the branches on `origin` or `github` disagree.

| Branch | What it is |
| --- | --- |
| upstream/lint-ignore-build | Head of keithligh/hk-traffic-intelligence#3 (keep build output out of ESLint). Delete when that PR closes. |
| upstream/sun-sky | Head of keithligh/hk-traffic-intelligence#5 (sky follows the sun). Delete when that PR closes. |
| upstream/ai-briefing | Head of keithligh/hk-traffic-intelligence#6 (AI city briefing). Delete when that PR closes. |
