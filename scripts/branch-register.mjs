import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"

export function registeredBranches(markdown) {
  const names = []
  for (const line of markdown.split("\n")) {
    const match = /^\|\s*([^|]+?)\s*\|/.exec(line)
    if (!match) continue
    const name = match[1].trim()
    if (!name || name === "Branch" || name.startsWith("---")) continue
    names.push(name)
  }
  return names
}

export function compareBranches(registered, remoteHeads) {
  const remote = [...new Set(remoteHeads.filter((name) => name !== "main"))].sort()
  const listed = [...new Set(registered)].sort()
  return {
    missing: listed.filter((name) => !remote.includes(name)),
    unlisted: remote.filter((name) => !listed.includes(name)),
  }
}

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim()
}

function remoteHeads(remote) {
  const text = git(["ls-remote", "--heads", remote])
  if (!text) return []
  return text.split("\n").map((line) => line.replace(/^[0-9a-f]+\s+refs\/heads\//, ""))
}

export function branchRegisterReport(markdown, heads) {
  const { missing, unlisted } = compareBranches(registeredBranches(markdown), heads)
  const lines = []
  if (unlisted.length === 0 && missing.length === 0) {
    lines.push(heads.some((name) => name !== "main") ? "Every side branch is listed in docs/branches.md." : "No side branches. Live site builds from main only.")
  }
  for (const name of unlisted) lines.push(`Unlisted branch: ${name}`)
  for (const name of missing) lines.push(`Listed branch is gone: ${name}`)
  return { ok: unlisted.length === 0 && missing.length === 0, lines }
}

function main() {
  const markdown = readFileSync(new URL("../docs/branches.md", import.meta.url), "utf8")
  const heads = [...remoteHeads("origin"), ...remoteHeads("github")]
  const report = branchRegisterReport(markdown, heads)
  for (const line of report.lines) console.log(line)
  if (!report.ok) process.exit(1)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main()
