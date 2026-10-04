import assert from "node:assert/strict"
import { compareBranches, registeredBranches, branchRegisterReport } from "./branch-register.mjs"
import { deployBlockReason } from "./deploy-main.mjs"

const markdown = `# Branches

| Branch | What it is |
| --- | --- |
| cursor/example-97e3 | One example |
`

assert.deepEqual(registeredBranches(markdown), ["cursor/example-97e3"])
assert.deepEqual(registeredBranches("# Branches\n\nNo side branches.\n"), [])
assert.deepEqual(compareBranches([], ["main"]), { missing: [], unlisted: [] })
assert.deepEqual(compareBranches(["cursor/example-97e3"], ["main", "cursor/example-97e3"]), { missing: [], unlisted: [] })
assert.deepEqual(compareBranches([], ["main", "cursor/example-97e3"]).unlisted, ["cursor/example-97e3"])
assert.deepEqual(compareBranches(["cursor/example-97e3"], ["main"]).missing, ["cursor/example-97e3"])
assert.equal(branchRegisterReport("# Branches\n", ["main"]).ok, true)
assert.equal(branchRegisterReport(markdown, ["main"]).ok, false)
assert.equal(deployBlockReason({ branch: "cursor/example-97e3", dirty: "", head: "abc", originMain: "abc" }).includes("main only"), true)
assert.equal(deployBlockReason({ branch: "main", dirty: " M data/gmb-network.json", head: "abc", originMain: "abc" }).includes("dirty"), true)
assert.equal(deployBlockReason({ branch: "main", dirty: "", head: "abc", originMain: "def" }).includes("origin/main"), true)
assert.equal(deployBlockReason({ branch: "main", dirty: "", head: "abc", originMain: "abc" }), "")
