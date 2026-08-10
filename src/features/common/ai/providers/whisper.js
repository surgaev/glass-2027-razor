let spawn, path, EventEmitter;

if (typeof window === 'undefined') {
    spawn = require('child_process').spawn;
    path = require('path');
    EventEmitter = require('events').EventEmitter;
} else {
    class DummyEventEmitter {
        on() {}
        emit() {}
        removeAllListeners() {}
    }
    EventEmitter = DummyEventEmitter;
}

// Audio format constants (must match the WAV header written by whisperService)
const VAD_SAMPLE_RATE = 24000;
const VAD_BYTES_PER_MS = VAD_SAMPLE_RATE * 2 / 1000; // 16-bit mono
const VAD_SILENCE_RMS_THRESHOLD = 300; // amplitude threshold (0-32767) below which a chunk counts as silence
const VAD_PAUSE_MS = 900;              // trailing silence needed to flush after speech was detected
const VAD_MIN_BUFFER_MS = 400;         // ignore pause-flush on near-empty buffers (coughs, clicks)
const VAD_MAX_BUFFER_MS = 8000;        // hard cap so continuous speech still gets flushed periodically

function computeRms(buffer) {
    const sampleCount = buffer.length / 2;
    if (sampleCount === 0) return 0;
    let sumSquares = 0;
    for (let i = 0; i + 1 < buffer.length; i += 2) {
        const sample = buffer.readInt16LE(i);
        sumSquares += sample * sample;
    }
    return Math.sqrt(sumSquares / sampleCount);
}

// Whisper's silence hallucinations have a recognisable shape: mixed scripts
// spliced into an otherwise single-language line, bare repeated "you", stock
// subtitle-credit phrases, and immediate self-repetition. A fabricated line is
// worse than a dropped one — it flows into the summary as an "insight" about
// something that was never said — so this biases hard toward dropping.
function isLikelyWhisperCliHallucination(raw) {
    const text = String(raw || '').trim();
    if (!text) return true;

    // Strip bracketed/parenthesised non-speech annotations first.
    const withoutAnnotations = text.replace(/[\[(][^\])]*[\])]/g, '').trim();
    if (!withoutAnnotations) return true;

    // \p{L}/\p{N} (Unicode letter/number categories) instead of a-z0-9 — the
    // original a-z0-9-only version silently stripped every Cyrillic/CJK/etc.
    // character, so any non-Latin transcript normalized to '' and got dropped
    // as a "hallucination" by the check below. This pipeline is pinned to
    // Russian (see the whisper-cli --language flag above), so that bug muted
    // nearly every real transcription.
    const normalized = withoutAnnotations.toLowerCase().replace(/[^\p{L}\p{N}\s']/gu, ' ').trim();
    if (!normalized) return true;

    const words = normalized.split(/\s+/).filter(Boolean);

    // Mostly non-speech annotation wearing a few real-looking words:
    // "[crying] (laughing) I'm a bigger girl. [crying] (laughing) [laughs]"
    const annotationCount = (text.match(/[\[(][^\])]*[\])]/g) || []).length;
    if (annotationCount >= 2 && annotationCount >= words.length / 2) return true;

    // Mixed scripts inside one short segment. A single Latin loanword dropped
    // into an otherwise non-Latin sentence is completely ordinary in Russian
    // business speech ("делаем flow", "нужен фикс") — that alone must NOT
    // trigger this. What's actually suspicious is Whisper switching languages
    // mid-segment on silence: two or more separate Latin words sharing a
    // segment with non-Latin words.
    const latinWords = words.filter(w => /^[a-z]{2,}$/.test(w));
    const nonLatinWordCount = words.length - latinWords.length;
    if (latinWords.length >= 2 && nonLatinWordCount > 0) return true;

    // The classic silence artifact: a bare "you", or "you you you".
    if (words.every(w => w === 'you')) return true;

    // Whisper's training data was full of subtitled video; on silence it
    // reaches for the credits.
    const stockPhrases = [
        'thank you', 'thanks for watching', 'thank you for watching',
        'subscribe', 'subtitles by', 'amara org', 'transcription by',
        "that's it", 'bye bye', 'okay',
    ];
    if (words.length <= 6 && stockPhrases.includes(normalized)) return true;

    // Immediate repetition of the same short fragment is a decoder loop, not speech.
    if (words.length >= 4 && words.length % 2 === 0) {
        const half = words.length / 2;
        if (words.slice(0, half).join(' ') === words.slice(half).join(' ')) return true;
    }

    return false;
}

class WhisperSTTSession extends EventEmitter {
    constructor(model, whisperService, sessionId) {
        super();
        this.model = model;
        this.whisperService = whisperService;
        this.sessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.process = null;
        this.isRunning = false;
        this.audioBuffer = Buffer.alloc(0);
        this.processingInterval = null;
        this.lastTranscription = '';
        this.hasSpeechSinceFlush = false;
        this.silenceMs = 0;
    }

    async initialize() {
        try {
            await this.whisperService.ensureModelAvailable(this.model);
            this.isRunning = true;
            this.startProcessingLoop();
            return true;
        } catch (error) {
            console.error('[WhisperSTT] Initialization error:', error);
            this.emit('error', error);
            return false;
        }
    }

    startProcessingLoop() {
        // Safety-net only: the real flush decision happens per-chunk in sendRealtimeInput
        // based on detected speech pauses. This interval just guarantees that continuous
        // speech (no pause) still gets flushed periodically via the VAD_MAX_BUFFER_MS cap.
        this.processingInterval = setInterval(async () => {
            const bufferMs = this.audioBuffer.length / VAD_BYTES_PER_MS;
            if (bufferMs >= VAD_MAX_BUFFER_MS && !this.process) {
                console.log(`[WhisperSTT-${this.sessionId}] Max buffer duration reached, flushing`);
                await this.processAudioChunk();
            }
        }, 1000);
    }

    async processAudioChunk() {
        if (!this.isRunning || this.audioBuffer.length === 0) return;

        this.hasSpeechSinceFlush = false;
        this.silenceMs = 0;

        const audioData = this.audioBuffer;
        this.audioBuffer = Buffer.alloc(0);

        try {
            const tempFile = await this.whisperService.saveAudioToTemp(audioData, this.sessionId);
            
            if (!tempFile || typeof tempFile !== 'string') {
                console.error('[WhisperSTT] Invalid temp file path:', tempFile);
                return;
            }
            
            const whisperPath = await this.whisperService.getWhisperPath();
            const modelPath = await this.whisperService.getModelPath(this.model);

            if (!whisperPath || !modelPath) {
                console.error('[WhisperSTT] Invalid whisper or model path:', { whisperPath, modelPath });
                return;
            }

            this.process = spawn(whisperPath, [
                '-m', modelPath,
                '-f', tempFile,
                '--no-timestamps',
                '--output-txt',
                '--output-json',
                '--language', 'ru',
                '--threads', '4',
                '--print-progress', 'false',
                '--suppress-nst',
                '--vad',
                '--vad-model', path.join(require('os').homedir(), '.glass', 'whisper', 'models', 'ggml-silero-v6.2.0.bin'),
                // Drop segments the model itself scores as non-speech.
                '--no-speech-thold', '0.6',
                // Reject low-confidence and high-entropy decodes — hallucinated
                // spans score badly on both.
                '--logprob-thold', '-1.0',
                '--entropy-thold', '2.4',
                // Greedy, no temperature fallback: the fallback ladder is what
                // lets the decoder keep retrying until it invents something.
                '--temperature', '0.0',
                '--no-fallback',
            ]);

            let output = '';
            let errorOutput = '';

            this.process.stdout.on('data', (data) => {
                output += data.toString();
            });

            this.process.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            this.process.on('close', async (code) => {
                this.process = null;
                
                if (code === 0 && output.trim()) {
                    const transcription = output.trim();
                    if (isLikelyWhisperCliHallucination(transcription)) {
                        console.log(`[WhisperSTT-${this.sessionId}] Filtered likely hallucination: "${transcription}"`);
                    } else if (transcription && transcription !== this.lastTranscription) {
                        this.lastTranscription = transcription;
                        console.log(`[WhisperSTT-${this.sessionId}] Transcription: "${transcription}"`);
                        this.emit('transcription', {
                            text: transcription,
                            timestamp: Date.now(),
                            confidence: 1.0,
                            sessionId: this.sessionId
                        });
                    }
                } else if (errorOutput) {
                    console.error(`[WhisperSTT-${this.sessionId}] Process error:`, errorOutput);
                }

                await this.whisperService.cleanupTempFile(tempFile);
            });

        } catch (error) {
            console.error('[WhisperSTT] Processing error:', error);
            this.emit('error', error);
        }
    }

    sendRealtimeInput(audioData) {
        if (!this.isRunning) {
            console.warn(`[WhisperSTT-${this.sessionId}] Session not running, cannot accept audio`);
            return;
        }

        if (typeof audioData === 'string') {
            try {
                audioData = Buffer.from(audioData, 'base64');
            } catch (error) {
                console.error('[WhisperSTT] Failed to decode base64 audio data:', error);
                return;
            }
        } else if (audioData instanceof ArrayBuffer) {
            audioData = Buffer.from(audioData);
        } else if (!Buffer.isBuffer(audioData) && !(audioData instanceof Uint8Array)) {
            console.error('[WhisperSTT] Invalid audio data type:', typeof audioData);
            return;
        }

        if (!Buffer.isBuffer(audioData)) {
            audioData = Buffer.from(audioData);
        }

        if (audioData.length > 0) {
            this.audioBuffer = Buffer.concat([this.audioBuffer, audioData]);
            // Log every 10th audio chunk to avoid spam
            if (Math.random() < 0.1) {
                console.log(`[WhisperSTT-${this.sessionId}] Received audio chunk: ${audioData.length} bytes, total buffer: ${this.audioBuffer.length} bytes`);
            }

            const chunkMs = audioData.length / VAD_BYTES_PER_MS;
            const rms = computeRms(audioData);
            if (rms > VAD_SILENCE_RMS_THRESHOLD) {
                this.hasSpeechSinceFlush = true;
                this.silenceMs = 0;
            } else {
                this.silenceMs += chunkMs;
            }

            const bufferMs = this.audioBuffer.length / VAD_BYTES_PER_MS;
            const pauseDetected = this.hasSpeechSinceFlush && this.silenceMs >= VAD_PAUSE_MS && bufferMs >= VAD_MIN_BUFFER_MS;

            if (pauseDetected && !this.process) {
                console.log(`[WhisperSTT-${this.sessionId}] Speech pause detected, flushing buffer (${bufferMs.toFixed(0)}ms)`);
                this.processAudioChunk();
            }
        }
    }

    async close() {
        console.log(`[WhisperSTT-${this.sessionId}] Closing session`);
        this.isRunning = false;

        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = null;
        }

        if (this.process) {
            this.process.kill('SIGTERM');
            this.process = null;
        }

        this.removeAllListeners();
    }
}

class WhisperProvider {
    static async validateApiKey() {
        // Whisper is a local service, no API key validation needed.
        return { success: true };
    }

    constructor() {
        this.whisperService = null;
    }

    async initialize() {
        if (!this.whisperService) {
            this.whisperService = require('../../services/whisperService');
            if (!this.whisperService.isInitialized) {
                await this.whisperService.initialize();
            }
        }
    }

    async createSTT(config) {
        await this.initialize();
        
        const model = config.model || 'whisper-tiny';
        const sessionType = config.sessionType || 'unknown';
        console.log(`[WhisperProvider] Creating ${sessionType} STT session with model: ${model}`);
        
        // Create unique session ID based on type
        const sessionId = `${sessionType}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        const session = new WhisperSTTSession(model, this.whisperService, sessionId);
        
        // Log session creation
        console.log(`[WhisperProvider] Created session: ${sessionId}`);
        
        const initialized = await session.initialize();
        if (!initialized) {
            throw new Error('Failed to initialize Whisper STT session');
        }

        if (config.callbacks) {
            if (config.callbacks.onmessage) {
                session.on('transcription', config.callbacks.onmessage);
            }
            if (config.callbacks.onerror) {
                session.on('error', config.callbacks.onerror);
            }
            if (config.callbacks.onclose) {
                session.on('close', config.callbacks.onclose);
            }
        }

        return session;
    }

    async createLLM() {
        throw new Error('Whisper provider does not support LLM functionality');
    }

    async createStreamingLLM() {
        console.warn('[WhisperProvider] Streaming LLM is not supported by Whisper.');
        throw new Error('Whisper does not support LLM.');
    }
}

module.exports = {
    WhisperProvider,
    WhisperSTTSession
};