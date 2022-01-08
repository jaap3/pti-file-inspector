class BitCrusher extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{
      name: 'bitDepth',
      defaultValue: 16,
      minValue: 1,
      maxValue: 16
    }]
  }

  process(inputs, outputs, parameters) {
    const [bitDepth,] = parameters.bitDepth

    const step = Math.pow(0.5, bitDepth - 1)

    const connections = Math.min(inputs.length, outputs.length)

    for (let connection = 0; connection < connections; connection++) {
      const input = inputs[connection]
      const output = outputs[connection]
      const channels = Math.min(input.length, output.length)
      for (let n = 0; n < channels; n++) {
        const inputChannel = input[n]
        const outputChannel = output[n]
        const bytes = Math.min(inputChannel.length, outputChannel.length)
        for (let i = 0; i < bytes; i++) {
          outputChannel[i] = step *  Math.floor(inputChannel[i] / step + 0.5)
        }
      }
    }

    return true // keep-alive
  }
}


registerProcessor('bitcrusher', BitCrusher)
