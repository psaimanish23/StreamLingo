// audio-processor.js

class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
      super();
      this.sampleRate = 16000; // Target sample rate for the model
      this.bufferSize = 4096; // Size of the buffer for processing
      this.buffer = [];
      this.bufferIndex = 0;
      this.downsampleFactor = sampleRate / this.sampleRate; // Calculate downsample factor

      this.port.onmessage = (event) => {
          // Handle messages from the main thread if needed
      };
  }

  downsampleBuffer(buffer, downsampleFactor) {
      if (downsampleFactor === 1) {
          return buffer; // No downsampling needed
      }
      const newLength = Math.round(buffer.length / downsampleFactor);
      const result = new Float32Array(newLength);
      let index = 0;
      let offset = 0;
      while (index < newLength) {
          result[index++] = buffer[Math.round(offset)];
          offset += downsampleFactor;
      }
      return result;
  }

  floatTo16BitPCM(input) {
      const output = new Int16Array(input.length);
      for (let i = 0; i < input.length; i++) {
          const s = Math.max(-1, Math.min(1, input[i]));
          output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF; // Convert to 16-bit PCM
      }
      return output;
  }

  process(inputs, outputs, parameters) {
      const input = inputs[0];
      if (input.length > 0) {
          const channelData = input[0]; // Processing the first channel (mono)
          
          // Downsample the buffer if needed
          const downsampledData = this.downsampleBuffer(channelData, this.downsampleFactor);

          // Convert the downsampled buffer to 16-bit PCM
          const pcmData = this.floatTo16BitPCM(downsampledData);

          // Send the 16-bit PCM data to the main thread
          this.port.postMessage(pcmData.buffer, [pcmData.buffer]); // Send ArrayBuffer

          return true; // Continue processing
      }
  }
}

registerProcessor('audio-processor', AudioProcessor);
