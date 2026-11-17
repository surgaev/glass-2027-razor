const DOWNLOAD_CHECKSUMS = {
    ollama: {
        dmg: {
            url: 'https://ollama.com/download/Ollama.dmg',
            sha256: null // TODO: 실제 체크섬 추가 필요 - null일 경우 체크섬 검증 스킵됨
        },
        exe: {
            url: 'https://ollama.com/download/OllamaSetup.exe',
            sha256: null // TODO: 실제 체크섬 추가 필요 - null일 경우 체크섬 검증 스킵됨
        },
        linux: {
            url: 'curl -fsSL https://ollama.com/install.sh | sh',
            sha256: null // TODO: 실제 체크섬 추가 필요 - null일 경우 체크섬 검증 스킵됨
        }
    },
    whisper: {
        models: {
            'whisper-tiny': {
                url: 'https://huggingface.co/ggml-org/whisper.cpp/resolve/main/ggml-tiny.bin',
                sha256: 'be07e048e1e599ad46341c8d2a135645097a538221678b7acdd1b1919c6e1b21'
            },
            'whisper-base': {
                url: 'https://huggingface.co/ggml-org/whisper.cpp/resolve/main/ggml-base.bin',
                sha256: '60ed5bc3dd14eea856493d334349b405782ddcaf0028d4b5df4088345fba2efe'
            },
            'whisper-small': {
                url: 'https://huggingface.co/ggml-org/whisper.cpp/resolve/main/ggml-small.bin',
                sha256: '1be3a9b2063867b937e64e2ec7483364a79917e157fa98c5d94b5c1fffea987b'
            },
            'whisper-large-v3-turbo-q5_0': {
                url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo-q5_0.bin',
                sha256: '394221709cd5ad1f40c46e6031ca61bce88931e6e088c188294c6d5a55ffa7e2'
            },
            'ggml-silero-v6.2.0': {
                url: 'https://huggingface.co/ggml-org/whisper-vad/resolve/main/ggml-silero-v6.2.0.bin',
                sha256: '2aa269b785eeb53a82983a20501ddf7c1d9c48e33ab63a41391ac6c9f7fb6987'
            },
            'whisper-medium': {
                url: 'https://huggingface.co/ggml-org/whisper.cpp/resolve/main/ggml-medium.bin',
                sha256: '6c14d5adee5f86394037b4e4e8b59f1673b6cee10e3cf0b11bbdbee79c156208'
            }
        },
        binaries: {
            'v1.7.6': {
                mac: {
                    url: 'https://github.com/ggml-org/whisper.cpp/releases/download/v1.7.6/whisper-cpp-v1.7.6-mac-x64.zip',
                    sha256: null // TODO: 실제 체크섬 추가 필요 - null일 경우 체크섬 검증 스킵됨
                },
                windows: {
                    url: 'https://github.com/ggml-org/whisper.cpp/releases/download/v1.7.6/whisper-cpp-v1.7.6-win-x64.zip',
                    sha256: null // TODO: 실제 체크섬 추가 필요 - null일 경우 체크섬 검증 스킵됨
                },
                linux: {
                    url: 'https://github.com/ggml-org/whisper.cpp/releases/download/v1.7.6/whisper-cpp-v1.7.6-linux-x64.tar.gz',
                    sha256: null // TODO: 실제 체크섬 추가 필요 - null일 경우 체크섬 검증 스킵됨
                }
            }
        }
    }
};

module.exports = { DOWNLOAD_CHECKSUMS };