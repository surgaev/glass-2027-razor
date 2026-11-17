const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { WhisperSTTSession } = require('../src/features/common/ai/providers/whisper');

test('Stop drains in-flight and buffered audio and preserves mixed-language speech', async t => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'glass-whisper-'));
    t.after(() => fs.rm(directory, { recursive: true, force: true }));
    const cli = path.join(directory, 'whisper-cli');
    await fs.writeFile(cli, '#!/bin/sh\ncat "$4"\n', { mode: 0o700 });
    const lines = ['Первая реплика', 'Проверим GitHub Actions завтра'];
    let index = 0;
    const service = {
        ensureModelAvailable: async () => {},
        getWhisperPath: async () => cli,
        getModelPath: async id => id,
        async saveAudioToTemp() {
            const file = path.join(directory, String(index));
            await fs.writeFile(file, lines[index++]);
            return file;
        },
        cleanupTempFile: file => fs.unlink(file)
    };
    const session = new WhisperSTTSession('test', service, 'test');
    const received = [];
    session.on('transcription', event => received.push(event.text));
    await session.initialize();
    session.sendRealtimeInput(Buffer.alloc(4800, 12));
    session.processAudioChunk();
    session.sendRealtimeInput(Buffer.alloc(4800, 12));
    await session.close();
    assert.deepEqual(received, lines);
    assert.deepEqual(await fs.readdir(directory), ['whisper-cli']);
});

test('Realtime waits for setup, commits on a pause and drains the final turn on Stop', async t => {
    const wsPath = require.resolve('ws');
    const original = require('ws');
    let socket;
    const sent = [];
    class FakeSocket {
        static OPEN = 1;
        readyState = 1;
        constructor() { socket = this; }
        send(raw) { sent.push(JSON.parse(raw)); }
        close() { this.readyState = 3; this.onclose({}); }
        receive(event) { this.onmessage({ data: JSON.stringify(event) }); }
    }
    require.cache[wsPath].exports = FakeSocket;
    const provider = require('../src/features/common/ai/providers/openai');
    t.after(() => { require.cache[wsPath].exports = original; });
    const finals = [];
    let ready = false;
    const opening = provider.createSTT({ apiKey: 'test', language: 'ru,en', callbacks: {
        onmessage: event => { if (event.transcript) finals.push(event.transcript); }
    }}).then(session => { ready = true; return session; });
    socket.onopen();
    await Promise.resolve();
    assert.equal(ready, false);
    const config = sent[0].session.audio.input;
    assert.equal(config.turn_detection, null);
    assert.deepEqual(config.transcription.languages, ['ru', 'en']);
    socket.receive({ type: 'session.updated' });
    const session = await opening;
    const audio = Buffer.alloc(4800, 30).toString('base64');
    session.sendRealtimeInput(audio);
    session.sendRealtimeInput(Buffer.alloc(33600).toString('base64'));
    session.sendRealtimeInput(audio);
    const closing = session.close();
    assert.equal(sent.filter(e => e.type === 'input_audio_buffer.commit').length, 2);
    const complete = transcript => socket.receive({ type: 'conversation.item.input_audio_transcription.completed', transcript });
    complete('Первая');
    assert.equal(socket.readyState, 1);
    complete('Последняя');
    await closing;
    assert.deepEqual(finals, ['Первая', 'Последняя']);
    assert.equal(socket.readyState, 3);

    const rejected = provider.createSTT({ apiKey: 'test' });
    socket.onopen();
    socket.receive({ type: 'error', error: { message: 'Invalid session configuration' } });
    await assert.rejects(rejected, /Invalid session configuration/);
});
