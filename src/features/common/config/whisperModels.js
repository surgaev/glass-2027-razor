const whisperModels = [
    { id: 'whisper-large-v3-turbo-q5_0', name: 'Whisper Large v3 Turbo (Q5, 574 MB)' },
    { id: 'whisper-tiny', name: 'Whisper Tiny (39M)' },
    { id: 'whisper-base', name: 'Whisper Base (74M)' },
    { id: 'whisper-small', name: 'Whisper Small (244M)' },
    { id: 'whisper-medium', name: 'Whisper Medium (769M)' },
];

module.exports = { whisperModels, defaultWhisperModel: whisperModels[0].id };
