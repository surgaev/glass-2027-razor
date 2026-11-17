const { computeRms } = require('./pcm');
const OpenAI = require('openai');
const WebSocket = require('ws');
const { Portkey } = require('portkey-ai');
const { Readable } = require('stream');
const { getProviderForModel } = require('../factory.js');


function getPortkeyApiKey() {
  const key = process.env.PORTKEY_API_KEY?.trim();
  if (!key) throw new Error('Set PORTKEY_API_KEY to use the Portkey provider.');
  return key;
}

class OpenAIProvider {
    static async validateApiKey(key) {
        if (!key || typeof key !== 'string' || !key.startsWith('sk-')) {
            return { success: false, error: 'Invalid OpenAI API key format.' };
        }

        try {
            const response = await fetch('https://api.openai.com/v1/models', {
                headers: { 'Authorization': `Bearer ${key}` }
            });

            if (response.ok) {
                return { success: true };
            } else {
                const errorData = await response.json().catch(() => ({}));
                const message = errorData.error?.message || `Validation failed with status: ${response.status}`;
                return { success: false, error: message };
            }
        } catch (error) {
            console.error(`[OpenAIProvider] Network error during key validation:`, error);
            return { success: false, error: 'A network error occurred during validation.' };
        }
    }
}


/**
 * Creates an OpenAI STT session
 * @param {object} opts - Configuration options
 * @param {string} opts.apiKey - OpenAI API key
 * @param {string} [opts.language='en'] - Language code
 * @param {object} [opts.callbacks] - Event callbacks
 * @param {boolean} [opts.usePortkey=false] - Whether to use Portkey
 * @param {string} [opts.portkeyVirtualKey] - Portkey virtual key
 * @returns {Promise<object>} STT session
 */
async function createSTT({ apiKey, language = 'en', callbacks = {}, usePortkey = false, portkeyVirtualKey, ...config }) {
  const keyType = usePortkey ? 'vKey' : 'apiKey';
  const key = usePortkey ? (portkeyVirtualKey || apiKey) : apiKey;

  const wsUrl = keyType === 'apiKey'
    ? 'wss://api.openai.com/v1/realtime?intent=transcription'
    : 'wss://api.portkey.ai/v1/realtime?intent=transcription';

  const headers = keyType === 'apiKey'
    ? {
        'Authorization': `Bearer ${key}`,
      }
    : {
        'x-portkey-api-key': getPortkeyApiKey(),
        'x-portkey-virtual-key': key,
      };

  const ws = new WebSocket(wsUrl, { headers });

  return new Promise((resolve, reject) => {
    let ready = false;
    let closing = false;
    let bufferedBytes = 0;
    let silenceMs = 0;
    let heardSpeech = false;
    let outstanding = 0;
    let finishClose;
    let closeTimer;
    let sessionError;
    const send = event => ws.send(JSON.stringify(event));
    const fail = error => {
      sessionError = error;
      clearTimeout(handshakeTimer);
      reject(error);
      callbacks.onerror?.(error);
      finishClose?.();
      if (ws.readyState === WebSocket.OPEN) ws.close();
    };
    const handshakeTimer = setTimeout(() => {
      fail(new Error('OpenAI transcription session setup timed out'));
      ws.terminate();
    }, 15000);

    function commit() {
      if (!bufferedBytes) return;
      // The API requires at least 100 ms of mono PCM16 for each commit.
      if (bufferedBytes < 4800) {
        send({ type: 'input_audio_buffer.append', audio: Buffer.alloc(4800 - bufferedBytes).toString('base64') });
      }
      send({ type: 'input_audio_buffer.commit' });
      outstanding++;
      bufferedBytes = 0;
      silenceMs = 0;
      heardSpeech = false;
    }

    const session = {
      sendRealtimeInput(audio) {
        if (closing || ws.readyState !== WebSocket.OPEN) return;
        const pcm = Buffer.from(audio, 'base64');
        if (!pcm.length) return;
        const speech = computeRms(pcm) > 300;
        heardSpeech ||= speech;
        silenceMs = speech ? 0 : silenceMs + pcm.length / 48;
        send({ type: 'input_audio_buffer.append', audio });
        bufferedBytes += pcm.length;
        if ((heardSpeech && silenceMs >= 700) || bufferedBytes >= 48000 * 15) {
          if (heardSpeech) commit();
          else {
            send({ type: 'input_audio_buffer.clear' });
            bufferedBytes = 0;
          }
        }
      },
      keepAlive() {
        if (ws.readyState === WebSocket.OPEN) ws.ping();
      },
      async close() {
        if (sessionError) throw sessionError;
        if (ws.readyState !== WebSocket.OPEN || closing) return;
        closing = true;
        try {
          if (bufferedBytes) commit();
          if (outstanding) {
            await new Promise(resolveClose => {
              finishClose = resolveClose;
              closeTimer = setTimeout(() => {
                sessionError = new Error('Timed out waiting for final transcription');
                callbacks.onerror?.(sessionError);
                resolveClose();
              }, 15000);
            });
          }
          if (sessionError) throw sessionError;
        } finally {
          clearTimeout(closeTimer);
          if (ws.readyState === WebSocket.OPEN) ws.close(1000);
        }
      }
    };

    ws.onopen = () => send({
      type: 'session.update',
      session: {
        type: 'transcription',
        audio: {
          input: {
            format: { type: 'audio/pcm', rate: 24000 },
            transcription: {
              model: 'gpt-live-transcribe',
              languages: (language || 'en').split(',').map(code => code.trim()).filter(Boolean),
              ...(config.prompt ? { prompt: config.prompt } : {})
            },
            turn_detection: null,
            noise_reduction: { type: 'near_field' }
          }
        }
      }
    });
    ws.onmessage = event => {
      let msg;
      try { msg = JSON.parse(event.data); } catch { return; }
      if (!msg) return;
      if (msg.type === 'error') {
        fail(new Error(msg.error?.message || 'OpenAI transcription error'));
        return;
      }
      if (msg.type === 'session.updated' && !ready) {
        clearTimeout(handshakeTimer);
        ready = true;
        resolve(session);
      }
      callbacks.onmessage?.({ ...msg, provider: 'openai' });
      if (msg.type === 'conversation.item.input_audio_transcription.completed' ||
          msg.type === 'conversation.item.input_audio_transcription.failed') {
        if (msg.error) callbacks.onerror?.(new Error(msg.error.message));
        outstanding = Math.max(0, outstanding - 1);
        if (!outstanding) finishClose?.();
      }
    };
    ws.onerror = event => fail(new Error(event.message || 'OpenAI WebSocket error'));
    ws.onclose = event => {
      clearTimeout(handshakeTimer);
      if (!ready) reject(new Error('OpenAI closed the connection before confirming the session'));
      if (ready && outstanding && !sessionError) {
        sessionError = new Error('OpenAI closed before returning the final transcription');
        callbacks.onerror?.(sessionError);
      }
      finishClose?.();
      callbacks.onclose?.(event);
    };
  });
}

/**
 * Creates an OpenAI LLM instance
 * @param {object} opts - Configuration options
 * @param {string} opts.apiKey - OpenAI API key
 * @param {string} [opts.model='gpt-4.1'] - Model name
 * @param {number} [opts.temperature=0.7] - Temperature
 * @param {number} [opts.maxTokens=2048] - Max tokens
 * @param {boolean} [opts.usePortkey=false] - Whether to use Portkey
 * @param {string} [opts.portkeyVirtualKey] - Portkey virtual key
 * @returns {object} LLM instance
 */
function createLLM({ apiKey, model = 'gpt-4.1', temperature = 0.7, maxTokens = 2048, usePortkey = false, portkeyVirtualKey, ...config }) {
  const client = new OpenAI({ apiKey });
  
  const callApi = async (messages) => {
    if (!usePortkey) {
      const response = await client.chat.completions.create({
        model: model,
        messages: messages,
        max_completion_tokens: maxTokens
      });
      return {
        content: response.choices[0].message.content.trim(),
        raw: response
      };
    } else {
      const fetchUrl = 'https://api.portkey.ai/v1/chat/completions';
      const response = await fetch(fetchUrl, {
        method: 'POST',
        headers: {
            'x-portkey-api-key': getPortkeyApiKey(),
            'x-portkey-virtual-key': portkeyVirtualKey || apiKey,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: model,
            messages,
            max_completion_tokens: maxTokens,
        }),
      });

      if (!response.ok) {
        throw new Error(`Portkey API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return {
        content: result.choices[0].message.content.trim(),
        raw: result
      };
    }
  };

  return {
    generateContent: async (parts) => {
      const messages = [];
      let systemPrompt = '';
      let userContent = [];
      
      for (const part of parts) {
        if (typeof part === 'string') {
          if (systemPrompt === '' && part.includes('You are')) {
            systemPrompt = part;
          } else {
            userContent.push({ type: 'text', text: part });
          }
        } else if (part.inlineData) {
          userContent.push({
            type: 'image_url',
            image_url: { url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` }
          });
        }
      }
      
      if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
      if (userContent.length > 0) messages.push({ role: 'user', content: userContent });
      
      const result = await callApi(messages);

      return {
        response: {
          text: () => result.content
        },
        raw: result.raw
      };
    },
    
    // For compatibility with chat-style interfaces
    chat: async (messages) => {
      return await callApi(messages);
    }
  };
}

/** 
 * Creates an OpenAI streaming LLM instance
 * @param {object} opts - Configuration options
 * @param {string} opts.apiKey - OpenAI API key
 * @param {string} [opts.model='gpt-4.1'] - Model name
 * @param {number} [opts.temperature=0.7] - Temperature
 * @param {number} [opts.maxTokens=2048] - Max tokens
 * @param {boolean} [opts.usePortkey=false] - Whether to use Portkey
 * @param {string} [opts.portkeyVirtualKey] - Portkey virtual key
 * @returns {object} Streaming LLM instance
 */
function createStreamingLLM({ apiKey, model = 'gpt-4.1', temperature = 0.7, maxTokens = 2048, usePortkey = false, portkeyVirtualKey, ...config }) {
  return {
    streamChat: async (messages) => {
      const fetchUrl = usePortkey 
        ? 'https://api.portkey.ai/v1/chat/completions'
        : 'https://api.openai.com/v1/chat/completions';
      
      const headers = usePortkey
        ? {
            'x-portkey-api-key': getPortkeyApiKey(),
            'x-portkey-virtual-key': portkeyVirtualKey || apiKey,
            'Content-Type': 'application/json',
          }
        : {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          };

      const response = await fetch(fetchUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: model,
          messages,
          max_completion_tokens: maxTokens,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      return response;
    }
  };
}

module.exports = {
    OpenAIProvider,
    createSTT,
    createLLM,
    createStreamingLLM
}; 