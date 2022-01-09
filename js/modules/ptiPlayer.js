import { SamplePlayback } from './constants.js'
import * as ptiTools from './ptiTools.js'

const { isOneShot, isLoop, relOffset } = ptiTools

let root
let reverbBuffer

/**
 * @typedef {Object} PtiPlayer
 * @property {function} playSample
 * @property {function} playSlice
 * @property {function} playInstrument
 * @property {function} stop
 */

/**
 * @param {HTMLAudioElement} audioEl
 * @param {AudioContext} ctx
 * @param {Float32Array} buffer
 * @param {ptiTools.HeaderParseResult} headerData
 * @return {Promise<PtiPlayer>}
 */
export async function load(audioEl, ctx, buffer, headerData) {
  root = `${audioEl.ownerDocument.location.pathname}js/modules/`
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

  const output = await createOutputChain(ctx, headerData)

  const instrumentOptions = {
    detune,
    loop,
    loopStart,
    loopEnd,
  }

  function playInstrument({ offset = startOffset, duration = endOffset ? endOffset - startOffset : undefined, detune = 0 }) {
    stop()
    source = new AudioBufferSourceNode(ctx, {
      ...instrumentOptions,
      buffer: instrumentAudioBuffer,
      detune: instrumentOptions.detune + detune
    })
    source.connect(output)
    source.start(0, offset, duration)
  }

  function playSlice(sliceIdx) {
    const start = slices[sliceIdx]
    const end = slices[sliceIdx + 1]
    playInstrument({ offset: start, duration: end ? end - start : undefined })
  }

  return {
    playSample,
    playInstrument,
    playSlice,
    stop,
  }
}


/**
 * Setup instrument output chain
 *
 * @param {AudioContext} ctx
 * @param {AudioNode} input
 * @param {ptiTools.HeaderParseResult} headerData
 * @return {Promise<AudioNode>}
 */
async function createOutputChain(ctx, headerData) {
  const input = new GainNode(ctx) // Do nothing, used to connect buffer to the chain
  let chain = input

  if (headerData.bitDepth !== 16) {
    chain = await createBitcrusher(ctx, chain, headerData.bitDepth)
  }

  if (headerData.overdrive) {
    chain = createOverdrive(ctx, chain, headerData.overdrive)
  }

  chain = chain.connect(new GainNode(ctx, { gain: headerData.volume / 50 }))  // volume

  // chain = chain.connect(filter)

  const pan = chain.connect(new StereoPannerNode(ctx, { pan: headerData.panning / 50 - 1 }))

  if (headerData.delaySend) {
    const delay = createDelay(ctx, chain, headerData.delaySend / 100, .5, .5)
    delay.connect(pan)
  }

  if (headerData.reverbSend) {
    const reverb = await createReverb(ctx, chain, headerData.reverbSend / 100, .0125)
    reverb.connect(pan)
  }

  pan.connect(ctx.destination)

  return input
}


/**
 * @param {AudioContext} ctx
 * @param {AudioNode} input
 * @param {number} drive
 */
function createOverdrive(ctx, input, drive) {
  const curve = new Float32Array(256)
  for (var i = 0; i < 256; i++) {
    const x = i * 2 / 256 - 1
    curve[i] = (Math.PI + drive) * x / (Math.PI + drive * Math.abs(x))
  }
  return input.connect(new WaveShaperNode(ctx, { curve }))
}

/**
 * @param {AudioContext} ctx
 * @param {AudioNode} input
 * @param {number} bitDepth
 */
async function createBitcrusher(ctx, input, bitDepth) {
  await ctx.audioWorklet.addModule(root + 'bitcrusher.js')
  return input.connect(new AudioWorkletNode(ctx, 'bitcrusher', { parameterData: { bitDepth } }))
}

/**
 * @param {AudioContext} ctx
 * @param {AudioNode} input
 * @param {number} sendLevel
 * @param {number} delayTime
 * @param {number} feedback
 * @return {AudioNode}
 */
function createDelay(ctx, input, sendLevel, delayTime, feedback) {
  const send = input.connect(new GainNode(ctx, { gain: sendLevel }))
  const delay = new DelayNode(ctx, { delayTime })
  delay.connect(new GainNode(ctx, { gain: feedback })).connect(delay)
  return send.connect(delay)
}

/**
 * @param {AudioContext} ctx
 * @return {Promise<AudioBuffer>}
 */
async function getReverbBuffer(ctx) {
  const response = await fetch(root + 'impulse.wav')
  const buffer = await response.arrayBuffer()
  return await ctx.decodeAudioData(
    buffer,
  )
}

/**
 * @param {AudioContext} ctx
 * @param {AudioNode} input
 * @param {number} sendLevel
 * @return {Promise<AudioNode>}
 */
export async function createReverb(ctx, input, sendLevel, delayTime) {
  const send = input.connect(new GainNode(ctx, { gain: sendLevel }))
  const preDelay = send.connect(new DelayNode(ctx, { delayTime }))
  const reverb = preDelay.connect(new ConvolverNode(ctx, {
    buffer: reverbBuffer ?? (reverbBuffer = await getReverbBuffer(ctx)),
  }))
  return reverb
}
