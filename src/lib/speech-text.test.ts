import assert from "node:assert/strict"
import { appendSpeech, SPEECH_LANG } from "./speech-text.ts"

assert.equal(SPEECH_LANG["zh-HK"], "yue-Hant-HK")
assert.equal(SPEECH_LANG["zh-CN"], "cmn-Hans-CN")
assert.equal(SPEECH_LANG.en, "en-US")

assert.equal(appendSpeech("", "我在銅鑼灣", "zh-HK", 200), "我在銅鑼灣")
assert.equal(appendSpeech("我在銅鑼灣，", "過海走哪條隧道最快", "zh-HK", 200), "我在銅鑼灣，過海走哪條隧道最快")
assert.equal(appendSpeech("I'm in Causeway Bay.", "which tunnel is fastest", "en", 200), "I'm in Causeway Bay. which tunnel is fastest")
assert.equal(appendSpeech("Hi ", "there", "en", 200), "Hi there")
assert.equal(appendSpeech("已打", "  ", "zh-HK", 200), "已打")
assert.equal(appendSpeech("一二三", "四五六七", "zh-HK", 5), "一二三四五")
assert.equal(appendSpeech("一二三四五六", "七", "zh-HK", 5), "一二三四五")
