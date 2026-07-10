/**
 * AudioWorklet Processor — optimized for Gemini Live API.
 * Buffers audio into ~100ms chunks (1600 samples @ 16kHz) to reduce
 * API call overhead while keeping latency low.
 */
class MicrophoneProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._muted = false;
    // Buffer 1600 samples = 100ms @ 16kHz — optimal balance of latency vs overhead
    this._bufferSize = 1600;
    this._buffer = new Int16Array(this._bufferSize);
    this._bufferIndex = 0;

    this.port.onmessage = (event) => {
      if (event.data.type === 'setMuted') {
        this._muted = event.data.muted;
        if (event.data.muted) {
          // Clear buffer when muted to avoid stale audio
          this._bufferIndex = 0;
        }
      }
    };
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;

    const channelData = input[0];
    if (!channelData) return true;

    if (this._muted) return true;

    // Accumulate samples into the fixed-size buffer
    for (let i = 0; i < channelData.length; i++) {
      const s = Math.max(-1, Math.min(1, channelData[i]));
      this._buffer[this._bufferIndex++] = s < 0 ? s * 0x8000 : s * 0x7fff;

      if (this._bufferIndex >= this._bufferSize) {
        // Buffer full — transfer it (zero-copy) and allocate a new one
        const outBuffer = this._buffer.buffer;
        this._buffer = new Int16Array(this._bufferSize);
        this._bufferIndex = 0;
        this.port.postMessage({ type: 'audio', buffer: outBuffer }, [outBuffer]);
      }
    }

    return true;
  }
}

registerProcessor('microphone-processor', MicrophoneProcessor);
