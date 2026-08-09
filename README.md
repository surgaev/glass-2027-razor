<p align="center">
  <a href="https://github.com/pickle-com/glass">
   <img src="./public/assets/banner.gif" alt="Logo">
  </a>

  <h1 align="center">Glass 2027 Razor 🪒🧠</h1>
  <p align="center"><i>A personal local-first fork of <a href="https://github.com/pickle-com/glass">Glass by Pickle</a></i></p>

</p>

> This is a personal fork of [pickle-com/glass](https://github.com/pickle-com/glass), which is itself a fork of [CheatingDaddy](https://github.com/sohzm/cheating-daddy). Thanks to the Pickle team, [Soham](https://x.com/soham_btw), and all the open-source contributors who made the original project possible.

🤖 **Fast, light & open-source**—Glass lives on your desktop, sees what you see, listens in real time, understands your context, and turns every moment into structured knowledge.

💬 **Proactive in meetings**—it surfaces action items, summaries, and answers the instant you need them.

🫥️ **Truly invisible**—never shows up in screen recordings, screenshots, or your dock; no always-on capture or hidden sharing.

🪒 **This fork's focus**—a debugged, tuned local-first setup: accurate offline Whisper + VAD speech recognition, a working OpenAI GA-API integration, and several UX/reliability fixes made while running it day-to-day on macOS.

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

### Use your own API key

<img width="100%" alt="booking-screen" src="./public/assets/02.gif">

**Currently Supporting:**
- OpenAI API: Get an OpenAI API Key [here](https://platform.openai.com/api-keys) — includes the July 2026 `gpt-live-transcribe` model for low-latency, noise-robust live transcription
- Gemini API: Get a Gemini API Key [here](https://aistudio.google.com/apikey)
- Local LLM via Ollama, local STT via Whisper + Silero VAD (fully offline, no API key needed)

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

1. **Install the `whisper-cli` binary** (Glass looks for it on `PATH` before trying to auto-install its own copy):
   ```bash
   brew install whisper-cpp
   ```
2. **Download the Silero VAD model** — Glass does not fetch this one automatically, it's a fork-specific addition:
   ```bash
   mkdir -p ~/.glass/whisper/models
   curl -L -o ~/.glass/whisper/models/ggml-silero-v6.2.0.bin \
     "https://huggingface.co/ggml-org/whisper-vad/resolve/main/ggml-silero-v6.2.0.bin"
   ```
3. **Enable Whisper in Settings → select "Whisper Medium" as the model.** Glass supports Tiny/Base/Small/Medium; Tiny is listed first and may get auto-selected by default, but all of this fork's VAD/pause/hallucination tuning was calibrated against **Medium** — smaller models will be faster but noticeably less accurate, larger isn't offered locally here. The `whisper-medium.bin` weights (~1.5GB) then download automatically the first time you start a Listen session.

**What's automatic vs. what you configure yourself:** every code-level fix and tuning value described above (VAD thresholds, pause-based chunking, sample-rate fix, hallucination blocklist, `gpt-live-transcribe` model, shorter Insights prompt, accumulating question list, font-size setting) is baked into the source and applies the moment you build this fork — nothing to set up for those. What is **not** part of the repo, and still needs to be done per-installation, is provider selection and API keys: which LLM/STT provider is active (OpenAI / Ollama / Whisper) and any API keys live in Glass's local app-data SQLite database (`~/Library/Application Support/Glass/pickleglass.db` on macOS), not in git. Pick your provider and enter your key(s) in Settings after building.

### Choosing an OpenAI model, topping up, and tracking spend

**Which model to pick** (as of July 2026, OpenAI's current lineup): the **GPT-5.6** family ships in three tiers — **Sol** (flagship), **Terra** (balanced, what this fork defaults to), and **Luna** (cheapest/fastest, $1/$6 per 1M input/output tokens). For everyday use through Glass (Q&A, meeting insights, short answers) Terra is a solid default; Luna is worth switching to for cost if it's enabled for your account (some accounts hit a `missing scopes` permission error on Luna specifically at launch — regenerate your API key with full/unrestricted permissions if you see that). Newer reasoning models (GPT-5.x, GPT-5.6) reject a custom `temperature` value and require `max_completion_tokens` — already handled by this fork's code, no action needed. For STT, this fork uses `gpt-live-transcribe`, OpenAI's July 2026 low-latency model tuned for noisy real-world audio — noticeably better than the older `gpt-4o-mini-transcribe` on real calls.

**Enabling models for your project:** newer/cheaper model tiers aren't always allow-listed for a project by default. Go to [platform.openai.com](https://platform.openai.com) → **Project Settings → Limits → Model usage → Select models** and make sure the models you want (`gpt-5.6-terra`, `gpt-live-transcribe`, etc.) are checked under "Allow".

**Topping up your balance:** [platform.openai.com/settings/organization/billing/overview](https://platform.openai.com/settings/organization/billing/overview) — add a payment method or credits here. Without a balance, every request fails with `insufficient_quota` regardless of which model or API key you use.

**Tracking how much you're spending:** [platform.openai.com/usage](https://platform.openai.com/usage) shows a cost breakdown by day/model in your browser. There is **no API endpoint** that returns your remaining USD balance or spend with a standard project-scoped API key — the billing endpoints (`/v1/dashboard/billing/...`) require a browser session, and `/v1/organization/usage/*` needs an org-admin key with a scope regular secret keys don't have. The `/usage` dashboard page above is the only reliable way to check.

### Running local models with Ollama — hardware guide

Ollama runs any LLM you point it at, but **model size vs. your RAM is the real constraint**, not anything Glass-specific. Reference point from tuning this fork on a **MacBook Pro, Apple M1 Pro, 16GB unified memory**:

| Model | Size on disk | Fits in 16GB? | Notes |
|---|---|---|---|
| `qwen3:14b` | 9.3GB | ✅ Comfortably | Best all-round pick at this size — good reasoning, handles Russian well, `--think=false` flag available for instant (non-reasoning) answers |
| `gemma4:e4b` | 9.6GB | ✅ Comfortably | Lighter/faster alternative, also has a thinking mode disable-able the same way |
| `deepseek-r1:7b` | 4.7GB on disk, **~11GB in RAM once loaded** | ⚠️ Tight | Strong at math/step-by-step reasoning (chain-of-thought), but always "thinks" — can't disable it, and its large default context window balloons RAM well past the file size |
| `qwen3.6:27b`, `gemma4:26b`+ | 15–20GB+ | ❌ Does not fit | Anything above ~14B dense parameters is off the table on 16GB — don't bother downloading |

**Key lessons learned tuning this on 16GB:**
- **RAM usage at runtime is much higher than the file size on disk** — it's driven mostly by the context window (KV cache). The Ollama desktop app's default context length is 64K, which alone can push a 9GB model to 15GB+ resident memory. For a Glass-style short-Q&A workload, dropping context length to **8K** in Ollama's settings (Context length slider) frees several GB with no real downside.
- **Watch for swap thrashing**: if `Load Average` shoots past ~50 and the whole Mac feels sluggish while a model is "thinking," that's swap, not the model being slow — kill the runaway process (`pkill -9 -f llama-server`) and lower context length or model size rather than waiting it out.
- **14B dense parameters is roughly the ceiling for smooth day-to-day use on 16GB.** Bigger models will technically load (macOS will swap to disk) but responses become painfully slow.
- If you're on 16GB and want speed over depth, `gemma4:e4b` with `--think=false` is close to instant; if you want better reasoning at the cost of some speed, `qwen3:14b` is the better default.

## Credits & Upstream

This fork tracks [pickle-com/glass](https://github.com/pickle-com/glass) — all credit for the original app, design, and architecture goes to the Pickle team. This fork exists to bring it up to date with current realities (OpenAI's Beta→GA Realtime API migration, newer GPT-5.x/gpt-live-transcribe models) and to fix the local Whisper+VAD path for real day-to-day use — see [This Fork's Changes](#this-forks-changes) above for the full list. For the upstream project's roadmap, contributing guide, and community, see the [original repository](https://github.com/pickle-com/glass) and their [Discord](https://discord.gg/UCZH5B5Hpd).

See [what's different from upstream](https://github.com/pickle-com/glass/compare/main...surgaev:glass-2027-razor:main) for a live, generated diff.

## Maintainer & Contact

Maintained by **Surgaev** — [www.surgaev.ru/eng](https://www.surgaev.ru/eng/) · Telegram: [@surgaev](https://t.me/surgaev)

Bug reports and feature requests: [Issues](https://github.com/surgaev/glass-2027-razor/issues). General questions and ideas: [Discussions](https://github.com/surgaev/glass-2027-razor/discussions). See [CONTRIBUTING.md](./CONTRIBUTING.md) and [ROADMAP.md](./ROADMAP.md) before opening a PR.

---

<h1 align="center">Glass 2027 Razor 🪒🧠 (Русская версия)</h1>
<p align="center"><i>Личный локально-ориентированный форк <a href="https://github.com/pickle-com/glass">Glass by Pickle</a></i></p>

> Это личный форк [pickle-com/glass](https://github.com/pickle-com/glass), который сам является форком [CheatingDaddy](https://github.com/sohzm/cheating-daddy). Спасибо команде Pickle, [Soham](https://x.com/soham_btw) и всем opensource-контрибьюторам, благодаря которым появился оригинальный проект.

🤖 **Быстрый, лёгкий и открытый исходный код** — Glass живёт на твоём рабочем столе, видит то же, что и ты, слушает в реальном времени, понимает контекст и превращает каждый момент в структурированное знание.

💬 **Проактивен на встречах** — сразу выдаёт пункты действий, саммари и ответы, как только они нужны.

🫥️ **Полностью невидим** — никогда не попадает в запись экрана, скриншоты или док; без скрытого постоянного захвата данных.

🪒 **Фокус этого форка** — отлаженная и настроенная локальная конфигурация: точное офлайн-распознавание речи (Whisper + VAD), рабочая интеграция с новым GA API OpenAI, и ряд UX/надёжностных правок, сделанных в процессе повседневного использования на macOS.

## Быстрый старт (локальная сборка)

### Предварительные требования

Сначала скачай и установи [Python](https://www.python.org/downloads/) и [Node](https://nodejs.org/en/download).
Если используешь Windows, дополнительно понадобятся [Build Tools for Visual Studio](https://visualstudio.microsoft.com/downloads/).

Убедись, что используешь Node.js версии 20.x.x — иначе возможны ошибки сборки нативных зависимостей.

```bash
# Проверить версию Node.js
node --version

# Если нужно установить Node.js 20.x.x, рекомендуем через nvm:
# curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
# nvm install 20
# nvm use 20
```

### Установка

```bash
npm run setup
```

## Возможности

### Ask: получай ответы на основе всей истории экрана и звука

<img width="100%" alt="booking-screen" src="./public/assets/00.gif">

### Встречи: заметки в реальном времени, живые саммари, записи сессий

<img width="100%" alt="booking-screen" src="./public/assets/01.gif">

### Используй свой собственный API-ключ

<img width="100%" alt="booking-screen" src="./public/assets/02.gif">

**Сейчас поддерживается:**
- OpenAI API: получить ключ можно [здесь](https://platform.openai.com/api-keys) — включая модель `gpt-live-transcribe` (июль 2026) для быстрой, устойчивой к шуму живой транскрипции
- Gemini API: получить ключ можно [здесь](https://aistudio.google.com/apikey)
- Локальный LLM через Ollama, локальный STT через Whisper + Silero VAD (полностью офлайн, без API-ключа)

## Горячие клавиши

`Ctrl/Cmd + \` : показать/скрыть главное окно

`Ctrl/Cmd + Enter` : задать вопрос ИИ на основе всей истории экрана и звука

`Ctrl/Cmd + стрелки` : переместить главное окно

## Что изменено в этом форке

Это личный форк с исправлениями и улучшениями, сделанными в процессе отладки локальной работы на macOS:

- **Локальный Whisper + VAD для точного офлайн-распознавания** — нарезка живого потока теперь идёт по обнаруженным паузам речи (энергетический VAD в `src/features/common/ai/providers/whisper.js`) вместо жёсткого таймера — устранены обрывы слов посередине. Добавлена [Silero VAD](https://huggingface.co/ggml-org/whisper-vad) на уровне `whisper-cli`, чтобы убрать выдуманные субтитры на тишине/фоновой музыке, плюс чёрный список типичных фраз-галлюцинаций (`src/features/listen/stt/sttService.js`) для тех, что всё же проскакивают.
- **Исправлено несовпадение частоты дискретизации** между захватом звука в рендерере (24kHz) и WAV-заголовком, который получал Whisper (был жёстко прописан как 16kHz) в `src/features/common/services/whisperService.js`.
- **Исправлено дублирование строк транскрипта** в интерфейсе Listen — ветка OpenAI Whisper в `sttService.js` отправляла каждую транскрипцию в интерфейс дважды (сразу и повторно через debounce/flush).
- **Миграция OpenAI Realtime STT (`src/features/common/ai/providers/openai.js`) со старого Beta API на новый GA API** (OpenAI отключили бета-версию в мае 2026) — новый формат события `session.update`, убран заголовок `OpenAI-Beta`, возвращён параметр `?intent=transcription`.
- **Исправлены вызовы моделей GPT-5.x** — новые reasoning-модели не принимают кастомную `temperature` (только дефолт `1`) и требуют `max_completion_tokens` вместо `max_tokens`; оба момента теперь корректно обрабатываются в `src/features/common/ai/providers/openai.js`.
- **Исправлен баг парсинга потокового ответа** в `src/features/ask/askService.js` — `TextDecoder.decode()` вызывался без `{ stream: true }`, а строки SSE не буферизовались между сетевыми чанками, из-за чего многобайтовые символы (кириллица и т.д.) молча портились или терялись посреди потока.
- **Сокращён промпт анализа Insights** для существенно меньшего расхода токенов, добавлен накапливающийся список вопросов (раньше каждый 5-реплико́вый цикл анализа полностью заменял список; теперь новые вопросы добавляются, а не стирают старые), и убран избыточный блок "Current Summary" из панели Insights.
- **Облачный STT переключён на `gpt-live-transcribe`** (модель OpenAI для низколатентной живой транскрипции, июль 2026) вместо `gpt-4o-mini-transcribe` — заметно лучше держит шумную реальную речь и фоновый шум.
- **Добавлена настраиваемая величина шрифта ответов Ask** (Settings → слайдер Response Font Size), синхронизируется между окнами через IPC + `electron-store`, а не через `localStorage` (который здесь ненадёжно шарится между отдельными `BrowserWindow`).
- **Отключено автоматическое открытие DevTools** на каждом окне в dev-режиме (теперь управляется переменной окружения `GLASS_DEVTOOLS=1`, по умолчанию выключено).

### Настройка локального Whisper + VAD с нуля

1. **Установи бинарник `whisper-cli`** (Glass сначала ищет его в `PATH`, и только потом пытается поставить свою копию сам):
   ```bash
   brew install whisper-cpp
   ```
2. **Скачай модель Silero VAD** — сам Glass её не подтягивает, это доработка именно этого форка:
   ```bash
   mkdir -p ~/.glass/whisper/models
   curl -L -o ~/.glass/whisper/models/ggml-silero-v6.2.0.bin \
     "https://huggingface.co/ggml-org/whisper-vad/resolve/main/ggml-silero-v6.2.0.bin"
   ```
3. **Включи Whisper в Settings → выбери модель "Whisper Medium".** Glass поддерживает Tiny/Base/Small/Medium; Tiny стоит первой в списке и может выбраться по умолчанию сама, но вся настройка VAD/пауз/фильтра галлюцинаций в этом форке калибровалась именно под **Medium** — модели поменьше будут быстрее, но заметно менее точные, а крупнее локально здесь не предлагается. Сами веса `whisper-medium.bin` (~1.5GB) скачаются автоматически при первом запуске сессии Listen.

**Что подтягивается автоматически, а что нужно настроить самому:** все правки и калибровка на уровне кода, описанные выше (пороги VAD, нарезка по паузам, фикс частоты дискретизации, чёрный список галлюцинаций, модель `gpt-live-transcribe`, укороченный промпт Insights, накапливающийся список вопросов, настройка размера шрифта) — уже зашиты в исходный код и применяются сразу, как только соберёшь этот форк — тут ничего дополнительно настраивать не нужно. А вот что **не входит** в репозиторий и всё равно нужно сделать самому на каждой установке — это выбор провайдера и API-ключи: какой LLM/STT провайдер активен (OpenAI / Ollama / Whisper) и сами ключи хранятся в локальной SQLite-базе данных приложения Glass (`~/Library/Application Support/Glass/pickleglass.db` на macOS), а не в git. Выбери провайдера и введи ключ(и) в Settings после сборки.

### Какую модель OpenAI выбрать, где пополнить баланс и смотреть траты

**Какую модель брать** (актуально на июль 2026): семейство **GPT-5.6** идёт тремя уровнями — **Sol** (флагман), **Terra** (баланс, используется в этом форке по умолчанию) и **Luna** (самая дешёвая/быстрая, $1/$6 за 1M токенов вход/выход). Для повседневной работы через Glass (вопросы, аналитика встреч, короткие ответы) Terra — хороший вариант по умолчанию; на Luna стоит переключиться ради экономии, если она включена для твоего аккаунта (у некоторых аккаунтов на старте была ошибка `missing scopes` именно на Luna — если увидишь такое, перевыпусти API-ключ с полными правами). Новые reasoning-модели (GPT-5.x, GPT-5.6) не принимают кастомную `temperature` и требуют `max_completion_tokens` — это уже обработано в коде этого форка, ничего делать не нужно. Для распознавания речи форк использует `gpt-live-transcribe` — модель OpenAI от июля 2026 для низколатентной транскрипции, заточенная под шумную реальную речь — заметно лучше старой `gpt-4o-mini-transcribe` на реальных звонках.

**Как включить модели для проекта:** новые/дешёвые уровни моделей не всегда разрешены для проекта по умолчанию. Зайди на [platform.openai.com](https://platform.openai.com) → **Project Settings → Limits → Model usage → Select models** и убедись, что нужные модели (`gpt-5.6-terra`, `gpt-live-transcribe` и т.д.) отмечены галочкой под "Allow".

**Пополнение баланса:** [platform.openai.com/settings/organization/billing/overview](https://platform.openai.com/settings/organization/billing/overview) — здесь добавляется способ оплаты или пополняются кредиты. Без баланса любой запрос упадёт с `insufficient_quota`, независимо от модели или ключа.

**Отслеживание трат:** [platform.openai.com/usage](https://platform.openai.com/usage) показывает разбивку расходов по дням/моделям прямо в браузере. **API-эндпоинта**, который бы возвращал остаток баланса в долларах при обычном ключе уровня проекта, **не существует** — биллинг-эндпоинты (`/v1/dashboard/billing/...`) требуют входа через браузерную сессию, а `/v1/organization/usage/*` требует ключ уровня администратора организации со scope, которого у обычных secret-ключей нет. Страница `/usage` выше — единственный надёжный способ проверить траты.

### Локальные модели через Ollama — по железу

Ollama запустит любую LLM, на которую её направишь, но **реальное ограничение — это размер модели против твоей RAM**, а не что-то специфичное для Glass. Ориентир по итогам настройки этого форка на **MacBook Pro, Apple M1 Pro, 16GB unified memory**:

| Модель | Размер на диске | Помещается в 16GB? | Заметки |
|---|---|---|---|
| `qwen3:14b` | 9.3GB | ✅ Комфортно | Лучший универсальный выбор такого размера — хорошее рассуждение, нормально работает с русским, есть флаг `--think=false` для мгновенных (без раздумий) ответов |
| `gemma4:e4b` | 9.6GB | ✅ Комфортно | Более лёгкая/быстрая альтернатива, thinking-режим тоже можно отключить тем же флагом |
| `deepseek-r1:7b` | 4.7GB на диске, **~11GB в RAM при загрузке** | ⚠️ Впритык | Сильна в математике/пошаговых рассуждениях (chain-of-thought), но всегда "думает" — отключить нельзя, а большое окно контекста по умолчанию раздувает RAM намного больше размера файла |
| `qwen3.6:27b`, `gemma4:26b`+ | 15–20GB+ | ❌ Не помещается | Всё выше ~14B dense-параметров не вариант для 16GB — даже не стоит скачивать |

**Ключевые выводы по итогам настройки на 16GB:**
- **Реальный расход RAM в рантайме намного выше размера файла на диске** — это в основном определяется окном контекста (KV-cache). Дефолтная длина контекста в приложении Ollama — 64K, из-за чего даже 9GB-модель может занять 15GB+ реальной памяти. Для сценария коротких вопросов-ответов, как в Glass, снижение длины контекста до **8K** (слайдер Context length в настройках Ollama) освобождает несколько GB без реальных потерь.
- **Следи за уходом в своп**: если `Load Average` резко подскакивает выше ~50, а весь Mac тормозит, пока модель "думает" — это своп, а не медленная модель сама по себе. Убей зависший процесс (`pkill -9 -f llama-server`) и снижай длину контекста или размер модели, а не жди.
- **14B dense-параметров — это примерно потолок для комфортной повседневной работы на 16GB.** Модели крупнее технически загрузятся (macOS уйдёт в своп), но ответы станут мучительно медленными.
- Если на 16GB важнее скорость, чем глубина рассуждений — `gemma4:e4b` с `--think=false` почти мгновенная; если важнее качество рассуждений ценой скорости — `qwen3:14b` лучший вариант по умолчанию.

## Благодарности и оригинальный проект

Этот форк отслеживает [pickle-com/glass](https://github.com/pickle-com/glass) — вся заслуга за оригинальное приложение, дизайн и архитектуру принадлежит команде Pickle. Этот форк существует, чтобы довести проект до текущих реалий (миграция OpenAI Beta→GA Realtime API, новые модели GPT-5.x/gpt-live-transcribe) и починить путь локального Whisper+VAD для реального повседневного использования — полный список см. в разделе [Что изменено в этом форке](#что-изменено-в-этом-форке) выше. Дорожную карту, гайд по контрибьютингу и сообщество оригинального проекта смотри в [исходном репозитории](https://github.com/pickle-com/glass) и их [Discord](https://discord.gg/UCZH5B5Hpd).

Смотри [чем этот форк отличается от оригинала](https://github.com/pickle-com/glass/compare/main...surgaev:glass-2027-razor:main) — живой, автоматически формируемый diff.

## Автор и контакты

Ведёт **Surgaev** — [www.surgaev.ru/eng](https://www.surgaev.ru/eng/) · Telegram: [@surgaev](https://t.me/surgaev)

Баг-репорты и предложения фич: [Issues](https://github.com/surgaev/glass-2027-razor/issues). Общие вопросы и идеи: [Discussions](https://github.com/surgaev/glass-2027-razor/discussions). Перед PR смотри [CONTRIBUTING.md](./CONTRIBUTING.md) и [ROADMAP.md](./ROADMAP.md).
