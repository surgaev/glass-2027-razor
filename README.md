<p align="center">
  <a href="https://pickle.com/glass">
   <img src="./public/assets/banner.gif" alt="Logo">
  </a>

  <h1 align="center">Glass by Pickle: Digital Mind Extension 🧠</h1>

</p>


<p align="center">
  <a href="https://discord.gg/UCZH5B5Hpd"><img src="./public/assets/button_dc.png" width="80" alt="Pickle Discord"></a>&ensp;<a href="https://pickle.com"><img src="./public/assets/button_we.png" width="105" alt="Pickle Website"></a>&ensp;<a href="https://x.com/intent/user?screen_name=leinadpark"><img src="./public/assets/button_xe.png" width="109" alt="Follow Daniel"></a>
</p>

> This project is a fork of [CheatingDaddy](https://github.com/sohzm/cheating-daddy) with modifications and enhancements. Thanks to [Soham](https://x.com/soham_btw) and all the open-source contributors who made this possible!

🤖 **Fast, light & open-source**—Glass lives on your desktop, sees what you see, listens in real time, understands your context, and turns every moment into structured knowledge.

💬 **Proactive in meetings**—it surfaces action items, summaries, and answers the instant you need them.

🫥️ **Truly invisible**—never shows up in screen recordings, screenshots, or your dock; no always-on capture or hidden sharing.

To have fun building with us, join our [Discord](https://discord.gg/UCZH5B5Hpd)!

## Instant Launch

⚡️  Skip the setup—launch instantly with our ready-to-run macOS app.  [[Download Here]](https://www.dropbox.com/scl/fi/znid09apxiwtwvxer6oc9/Glass_latest.dmg?rlkey=gwvvyb3bizkl25frhs4k1zwds&st=37q31b4w&dl=1)

## Quick Start (Local Build)

### Prerequisites

First download & install [Python](https://www.python.org/downloads/) and [Node](https://nodejs.org/en/download).
If you are using Windows, you need to also install [Build Tools for Visual Studio](https://visualstudio.microsoft.com/downloads/)

Ensure you're using Node.js version 20.x.x to avoid build errors with native dependencies.

```bash
# Check your Node.js version
node --version

# If you need to install Node.js 20.x.x, we recommend using nvm:
# curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
# nvm install 20
# nvm use 20
```

### Installation

```bash
npm run setup
```

## Highlights


### Ask: get answers based on all your previous screen actions & audio

<img width="100%" alt="booking-screen" src="./public/assets/00.gif">

### Meetings: real-time meeting notes, live summaries, session records

<img width="100%" alt="booking-screen" src="./public/assets/01.gif">

### Use your own API key, or sign up to use ours (free)

<img width="100%" alt="booking-screen" src="./public/assets/02.gif">

**Currently Supporting:**
- OpenAI API: Get OpenAI API Key [here](https://platform.openai.com/api-keys)
- Gemini API: Get Gemini API Key [here](https://aistudio.google.com/apikey)
- Local LLM Ollama & Whisper

### Liquid Glass Design (coming soon)

<img width="100%" alt="booking-screen" src="./public/assets/03.gif">

<p>
  for a more detailed guide, please refer to this <a href="https://www.youtube.com/watch?v=qHg3_4bU1Dw">video.</a>
  <i style="color:gray; font-weight:300;">
    we don't waste money on fancy vids; we just code.
  </i>
</p>


## Keyboard Shortcuts

`Ctrl/Cmd + \` : show and hide main window

`Ctrl/Cmd + Enter` : ask AI using all your previous screen and audio

`Ctrl/Cmd + Arrows` : move main window position

## This Fork's Changes

This is a personal fork with fixes and improvements made while debugging local-first usage on macOS:

- **Local Whisper + VAD for accurate offline STT** — real-time chunking now splits on detected speech pauses (energy-based VAD in `src/features/common/ai/providers/whisper.js`) instead of a fixed timer, fixing mid-word cutoffs. Added [Silero VAD](https://huggingface.co/ggml-org/whisper-vad) at the `whisper-cli` level to eliminate hallucinated captions on silence/background music, plus a hallucination-phrase blocklist (`src/features/listen/stt/sttService.js`) for the ones that still slip through.
- **Fixed sample-rate mismatch** between the renderer's audio capture (24kHz) and the WAV header Whisper receives (was hardcoded to 16kHz) in `src/features/common/services/whisperService.js`.
- **Fixed duplicate transcript lines** in the Listen UI — the OpenAI Whisper branch of `sttService.js` was sending every transcription to the renderer twice (once immediately, once again via the debounce/flush path).
- **Migrated OpenAI Realtime STT (`src/features/common/ai/providers/openai.js`) from the deprecated Beta API to the GA API** (OpenAI retired the beta shape in May 2026) — new `session.update` event shape, no more `OpenAI-Beta` header, `?intent=transcription` query param restored.
- **Fixed GPT-5.x LLM calls** — newer reasoning models reject a custom `temperature` (only default `1` is supported) and require `max_completion_tokens` instead of `max_tokens`; both are now handled correctly in `src/features/common/ai/providers/openai.js`.
- **Fixed a streaming-response parsing bug** in `src/features/ask/askService.js` — `TextDecoder.decode()` was called without `{ stream: true }` and SSE lines weren't buffered across network chunks, silently corrupting or dropping multi-byte (Cyrillic etc.) characters mid-stream.
- **Shortened the Insights analysis prompt for a much smaller token footprint**, added a persistent question list (previously each 5-turn analysis cycle replaced the whole list; now new questions accumulate instead of disappearing), and removed the redundant "Current Summary" block from the Insights panel.
- **Switched cloud STT to `gpt-live-transcribe`** (OpenAI's July 2026 low-latency live transcription model) instead of `gpt-4o-mini-transcribe` — noticeably better on noisy real-world audio and background speech.
- **Added a configurable Ask response font size** (Settings → Response Font Size slider), synced across windows via IPC + `electron-store` rather than `localStorage` (which isn't reliably shared across separate `BrowserWindow`s here).
- **Disabled auto-opening DevTools** on every window in dev mode (`GLASS_DEVTOOLS=1` env var now gates it, off by default).

### Setting up local Whisper + VAD from scratch

Glass downloads the Whisper model automatically on first use. The VAD model needs one manual step:

```bash
brew install whisper-cpp
mkdir -p ~/.glass/whisper/models
curl -L -o ~/.glass/whisper/models/ggml-silero-v6.2.0.bin \
  "https://huggingface.co/ggml-org/whisper-vad/resolve/main/ggml-silero-v6.2.0.bin"
```

## Repo Activity

![Alt](https://repobeats.axiom.co/api/embed/a23e342faafa84fa8797fa57762885d82fac1180.svg "Repobeats analytics image")

## Contributing

We love contributions! Feel free to open issues for bugs or feature requests. For detailed guide, please see our [contributing guide](/CONTRIBUTING.md).
> Currently, we're working on a full code refactor and modularization. Once that's completed, we'll jump into addressing the major issues.

### Contributors

<a href="https://github.com/pickle-com/glass/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=pickle-com/glass" />
</a>

### Help Wanted Issues

We have a list of [help wanted](https://github.com/pickle-com/glass/issues?q=is%3Aissue%20state%3Aopen%20label%3A%22%F0%9F%99%8B%E2%80%8D%E2%99%82%EF%B8%8Fhelp%20wanted%22) that contain small features and bugs which have a relatively limited scope. This is a great place to get started, gain experience, and get familiar with our contribution process.


### 🛠 Current Issues & Improvements

| Status | Issue                          | Description                                       |
|--------|--------------------------------|---------------------------------------------------|
| 🚧 WIP      | Liquid Glass                    | Liquid Glass UI for MacOS 26 |

### Changelog

- Jul 5: Now support Gemini, Intel Mac supported
- Jul 6: Full code refactoring has done.
- Jul 7: Now support Claude, LLM/STT model selection
- Jul 8: Now support Windows(beta), Improved AEC by Rust(to seperate mic/system audio), shortcut editing(beta)
- Jul 8: Now support Local LLM & STT, Firebase Data Storage 


## About Pickle

**Our mission is to build a living digital clone for everyone.** Glass is part of Step 1—a trusted pipeline that transforms your daily data into a scalable clone. Visit [pickle.com](https://pickle.com) to learn more.

## Star History
[![Star History Chart](https://api.star-history.com/svg?repos=pickle-com/glass&type=Date)](https://www.star-history.com/#pickle-com/glass&Date)
