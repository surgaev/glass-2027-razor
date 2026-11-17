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

module.exports = { computeRms };
