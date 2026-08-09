# Contributing to Glass 2027 Razor

This is a personal fork of [pickle-com/glass](https://github.com/pickle-com/glass), maintained by [@surgaev](https://github.com/surgaev). It exists to keep a local-first Glass setup (offline Whisper + VAD speech recognition, OpenAI's current GA Realtime API) working reliably on macOS. See [ROADMAP.md](./ROADMAP.md) for what's planned.

## Reporting a bug or requesting a feature

Open an [issue](https://github.com/surgaev/glass-2027-razor/issues) — screenshots, logs (`/tmp/glass-start.log` if you're running via `restart.sh`), and steps to reproduce are the most useful things you can include. For STT/transcription issues, note which provider you're using (local Whisper vs. OpenAI) and whether you're on headphones or speakers (echo/cross-talk between mic and system audio is a common false alarm — see the README).

General questions, ideas, or "does anyone else see this" posts belong in [Discussions](https://github.com/surgaev/glass-2027-razor/discussions) rather than Issues.

## Submitting a change

1. Fork this repo and branch off `main`.
2. Keep changes focused — one fix or feature per PR is much easier to review than a mixed bag.
3. Test manually before opening the PR: `npm run setup`, then actually exercise the Ask and Listen flows you touched. This project doesn't have meaningful automated test coverage yet, so manual verification is the bar.
4. Open the PR against `main` here, with a short description of *why*, not just *what* — the commit history in this repo tries to explain root causes, not just the fix, and PRs should follow the same habit.

## Contributing back upstream

If your fix addresses a bug that also exists in [pickle-com/glass](https://github.com/pickle-com/glass) (not something specific to this fork's local-first setup), consider opening a PR there too — see their [CONTRIBUTING.md](https://github.com/pickle-com/glass/blob/main/CONTRIBUTING.md) for their process, which is more formal (issue-first, `/assign` claiming, design-pattern review). Small, self-contained bug fixes — not this fork's full opinionated VAD/prompt tuning — are the best upstream PR candidates.

## Project structure

See the [README](./README.md#this-forks-changes) for a description of what's changed relative to upstream and which files own which behavior — that's the fastest way to find where a given bug likely lives.

## Developing

### Prerequisites

Ensure the following are installed:
- [Node.js v20.x.x](https://nodejs.org/en/download)
- [Python](https://www.python.org/downloads/)
- (Windows users) [Build Tools for Visual Studio](https://visualstudio.microsoft.com/downloads/)

Ensure you're using Node.js version 20.x.x to avoid build errors with native dependencies.

```bash
# Check your Node.js version
node --version

# If you need to install Node.js 20.x.x, we recommend using nvm:
# curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
# nvm install 20
# nvm use 20
```

### Setup and build

```bash
npm run setup
```

Make sure you can produce a full production build (`npm run build`) before opening a PR.

### Linting

```bash
npm run lint
```

Fix any errors before committing.
