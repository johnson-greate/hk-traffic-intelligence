import { execFileSync, spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { branchRegisterReport } from "./branch-register.mjs"

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim()
}

function heads(remote) {
  const text = git(["ls-remote", "--heads", remote])
  if (!text) return []
  return text.split("\n").map((line) => line.replace(/^[0-9a-f]+\s+refs\/heads\//, ""))
}

export function deployBlockReason({ branch, dirty, head, originMain }) {
  if (branch !== "main") return `Refusing to deploy from ${branch || "a detached commit"}. The live site is built from main only.`
  if (dirty) return "Refusing to deploy a dirty tree. Commit on main first."
  if (head !== originMain) return "Refusing to deploy. This commit is not origin/main."
  return ""
}

function isDirectRun() {
  if (!process.argv[1]) return false
  return import.meta.url === pathToFileURL(resolve(process.argv[1])).href
}

if (isDirectRun()) {
  execFileSync("git", ["fetch", "origin", "main"], { stdio: "inherit" })
  const reason = deployBlockReason({
    branch: git(["branch", "--show-current"]),
    dirty: git(["status", "--porcelain"]),
    head: git(["rev-parse", "HEAD"]),
    originMain: git(["rev-parse", "origin/main"]),
  })
  if (reason) {
    console.error(reason)
    process.exit(1)
  }

  const register = branchRegisterReport(readFileSync(new URL("../docs/branches.md", import.meta.url), "utf8"), [
    ...heads("origin"),
    ...heads("github"),
  ])
  for (const line of register.lines) console.log(line)
  if (!register.ok) process.exit(1)

  const result = spawnSync("vinext-cloudflare", ["deploy"], { stdio: "inherit" })
  process.exit(result.status === null ? 1 : result.status)
}
