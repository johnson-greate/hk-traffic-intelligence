// Sends one System One request to Jev and prints the JSON response.
// With TYPESAFE_API_KEY it calls TypeSafe directly (https://docs.typesafe.ai/api.md);
// otherwise it goes through OpenRouter with OPENROUTER_API_KEY.
// Questions are sent as given. This script does not rewrite them.
// Model page: https://openrouter.ai/~typesafe/jev-latest

// Keys may live in .env; variables already set in the shell win.
try {
  process.loadEnvFile(".env")
} catch {
  // No .env here.
}

const typesafe = process.env.TYPESAFE_API_KEY
const key = typesafe || process.env.OPENROUTER_API_KEY
if (!key) {
  console.error("Set TYPESAFE_API_KEY or OPENROUTER_API_KEY before asking Jev.")
  process.exit(1)
}
const endpoint = typesafe ? "https://api.typesafe.ai/v1/systemone" : "https://openrouter.ai/api/alpha/decisions"
// The same model is "jev-latest" at TypeSafe and "~typesafe/jev-latest" at OpenRouter.
const defaultModel = typesafe ? "jev-latest" : "~typesafe/jev-latest"

const inputPath = process.argv[2]
const raw = inputPath
  ? await import("node:fs/promises").then((fs) => fs.readFile(inputPath, "utf8"))
  : await new Response(process.stdin).text()

const request = JSON.parse(raw)
if (request.state === undefined || request.state === null) {
  throw new Error("Request needs state.")
}
if (!request.questions || typeof request.questions !== "object" || Array.isArray(request.questions)) {
  throw new Error("Request needs a questions object.")
}

const body = {
  state: request.state,
  model: typesafe ? (request.model ?? defaultModel).replace(/^~typesafe\//, "") : (request.model ?? defaultModel),
  questions: request.questions,
}

const response = await fetch(endpoint, {
  method: "POST",
  headers: typesafe
    ? { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }
    : {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://origin.cursor.com/git/keithli/opentransport",
        "X-Title": "Harbour corridors",
      },
  body: JSON.stringify(body),
})

const text = await response.text()
if (!response.ok) {
  console.error(text)
  process.exit(1)
}

process.stdout.write(text.endsWith("\n") ? text : `${text}\n`)
