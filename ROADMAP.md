# Roadmap

This is a personal fork, so the roadmap is driven by real usage rather than a formal release plan. Rough priority order:

## Near-term

- **Fix `gpt-5.6-luna` access** — currently returns an `insufficient permissions` / missing-scopes error on this fork's account even though `gpt-5.6-terra` works fine on the same key. Likely an OpenAI-side rollout issue with the newest, cheapest GPT-5.6 tier; worth re-testing periodically and switching once it works, since Luna is meaningfully cheaper than Terra for the same Ask/Insights workload.
- **VAD-based chunking for the OpenAI Realtime STT path** — the local Whisper path already segments live audio on detected speech pauses instead of a fixed timer (see [This Fork's Changes](./README.md#this-forks-changes)); the OpenAI `gpt-live-transcribe` path currently relies on OpenAI's own server-side `server_vad`, which is tuned (`silence_duration_ms`, `prefix_padding_ms`) but not using the same pause-detection logic. Worth comparing transcript quality between the two paths on real (not dictated) conversations.
- **Automated echo/cross-talk mitigation** — right now the fix for mic-picks-up-speaker-audio duplication is "wear headphones." Investigate whether the existing Rust AEC module (`src/ui/listen/audioCore/aec.js`) can be tuned further to reduce this without requiring headphones, especially for laptop-speaker + laptop-mic setups.

## Medium-term

- **GitHub Releases with signed macOS binaries** — most people won't build an Electron app from source. Needs a decision on code signing (unsigned builds trigger Gatekeeper warnings) and whether to notarize.
- **Small, focused PRs back to [pickle-com/glass](https://github.com/pickle-com/glass)** for the fixes here that aren't fork-specific opinion (e.g. the duplicate-transcript-line bug, the GPT-5.x `temperature`/`max_completion_tokens` handling, the streaming `TextDecoder` multi-byte-corruption bug, the sample-rate mismatch). These are worth upstreaming even if this fork's overall VAD/prompt tuning isn't.
- **Revisit the Insights token budget** as OpenAI's cheaper GPT-5.6 tiers become fully available — the current prompt was shortened mainly to control cost on `gpt-5.5`/`gpt-5.6-terra`; a cheaper default model changes that calculus.

## Longer-term / exploratory

- Evaluate whether `gpt-transcribe` (OpenAI's async/batch transcription model, released alongside `gpt-live-transcribe`) is worth using for the "Show summary" / post-hoc analysis paths, as distinct from the live Listen path.
- Windows support for this fork's local Whisper + VAD path is untested — upstream Glass supports Windows, but all of this fork's tuning was done on macOS (M1 Pro).

---

Have a suggestion? Open a [Discussion](https://github.com/surgaev/glass-2027-razor/discussions) rather than an Issue if it's not a concrete bug — Issues are for tracking actionable work.
