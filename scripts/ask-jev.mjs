// Sends one System One request to Jev through OpenRouter and prints the JSON response.
// Questions are sent as given. This script does not rewrite them.
// Model page: https://openrouter.ai/~typesafe/jev-latest

const endpoint = "https://openrouter.ai/api/alpha/decisions"

const key = process.env.OPENROUTER_API_KEY
if (!key) {
  console.error("Set OPENROUTER_API_KEY before asking Jev.")
  process.exit(1)
}

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
  model: request.model ?? "~typesafe/jev-latest",
  questions: request.questions,
}

const response = await fetch(endpoint, {
  method: "POST",
  headers: {
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
