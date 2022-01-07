import { SamplePlayback } from './constants.js'
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

  const detune = headerData.tune * 100 + headerData.finetune
  const slices = Array.from(headerData.slices).map(absOffset)

  const endOffset = oneShot ? absOffset(headerData.playbackEnd) : undefined
  const startOffset = oneShot || loop ? absOffset(headerData.playbackStart) : undefined
  let loopStart = loop ? absOffset(headerData.loopStart) : undefined
  let loopEnd = loop ? absOffset(headerData.loopEnd) : undefined

  let instrumentAudioBuffer
  switch (headerData.samplePlayback) {
    case SamplePlayback.BACKWARD_LOOP:
    case SamplePlayback.PINGPONG_LOOP:
      // AudioBufferSourceNode does not support backward of ping-pong loops,
      // so we'll have to improvise. First find the loop region...
      const regionStart = Math.round(relOffset(headerData.loopStart) * bufferLength)
      const regionEnd = Math.round(relOffset(headerData.loopEnd) * bufferLength)

      // Get the audio data for the loop region and reverse it...
      const loopRegion = buffer.slice(regionStart, regionEnd)
      loopRegion.reverse()

      // Insert the reversed loop region after the original region
      const loopBuffer = new Float32Array(regionEnd + loopRegion.length)
      loopBuffer.set(buffer.slice(0, regionEnd + 1))
      loopBuffer.set(loopRegion, regionEnd)

      instrumentAudioBuffer = ctx.createBuffer(1, loopBuffer.length, 44100)
      instrumentAudioBuffer.copyToChannel(loopBuffer, 0)

      if (headerData.samplePlayback === SamplePlayback.BACKWARD_LOOP) {
        // Move the loop start to what used to be the loop's end,
        // this is where the reversed region now is.
        loopStart = loopEnd
      }

      // Move the loop point end to the end of the modified sample
      loopEnd = loopBuffer.length / 44100
      break

    default:
      instrumentAudioBuffer = audioBuffer
  }

  const gain = new GainNode(ctx, { gain: headerData.volume / 50 })
  const pan = new StereoPannerNode(ctx, { pan: headerData.panning / 50 - 1 })

  gain.connect(pan)
  pan.connect(ctx.destination)

  const instrumentOptions = {
    detune,
    loop,
    loopStart,
    loopEnd,
  }

  function playInstrument(offset = startOffset, duration = endOffset ? endOffset - startOffset : undefined) {
    stop()
    source = new AudioBufferSourceNode(ctx, {
      ...instrumentOptions,
      buffer: instrumentAudioBuffer,
    })
    source.connect(gain)
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
