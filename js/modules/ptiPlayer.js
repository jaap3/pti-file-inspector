import * as ptiTools from './ptiTools.js'

const { isOneShot, isLoop, relOffset } = ptiTools

/**
 * @typedef {Object} PtiPlayer
 * @property {function} playSample
 * @property {function} playSlice
 * @property {function} playInstrument
 * @property {function} stop
 */

/**
 * @param {AudioContext} ctx
 * @param {Float32Array} buffer
 * @param {ptiTools.HeaderParseResult} headerData
 * @return {PtiPlayer}
 */
export function load(ctx, buffer, headerData) {
  const bufferLength = buffer.length
  const audioBuffer = ctx.createBuffer(1, bufferLength, 44100)
  audioBuffer.copyToChannel(buffer, 0)

  const sampleLength = bufferLength / 44100
  const absOffset = (offset) => relOffset(offset) * sampleLength

  let source;

  function stop() {
    source?.stop() && (source = null)
  }

  function playSample() {
    stop()
    source = new AudioBufferSourceNode(ctx, {
      buffer: audioBuffer,
    })
    source.connect(ctx.destination)
    source.start(0)
  }

  const oneShot = isOneShot(headerData.samplePlayback)
  const loop = isLoop(headerData.samplePlayback)
  const startOffset = oneShot || loop ? absOffset(headerData.playbackStart) : undefined
  const endOffset = oneShot ? absOffset(headerData.playbackEnd) : undefined
  const loopStart = loop ? absOffset(headerData.loopStart) : undefined
  const loopEnd = loop ? absOffset(headerData.loopEnd) : undefined
  const slices = Array.from(headerData.slices).map(absOffset)

  const instrumentOptions = {
    loop,
    loopEnd,
    loopStart
  }

  function playInstrument(offset = startOffset, duration = endOffset ? endOffset - startOffset : undefined) {
    stop()
    source = new AudioBufferSourceNode(ctx, {
      ...instrumentOptions,
      buffer: audioBuffer,
    })
    source.connect(ctx.destination)
    source.start(0, offset, duration)
  }

  function playSlice(sliceIdx) {
    const start = slices[sliceIdx]
    const end = slices[sliceIdx + 1]
    playInstrument(start, end ? end - start : undefined)
  }

  return {
    playSample,
    playInstrument,
    playSlice,
    stop,
  }
}
