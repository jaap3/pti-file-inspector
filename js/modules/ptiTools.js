import { SamplePlayback } from './constants.js'

const {
  ONE_SHOT,
  FORWARD_LOOP, PINGPONG_LOOP,
  SLICE, BEAT_SLICE,
  WAVETABLE, GRANULAR
} = SamplePlayback

const MAGIC = {
  0: 84,
  1: 73,
  2: 1,
  3: 0,
  4: 1,
  5: [4, 5],
  6: [0, 1],
  7: 1,
  8: 9,
  9: 9,
  10: 9,
  11: 9,
  12: 116,
  13: 1,
  14: [102, 110],
  15: 102,
  16: 1,
  17: 0,
  18: 0,
  19: 0
}

/**
 * Get the header from a .pti
 * @param {File} file
 * @returns {Promise<ArrayBuffer>}
 */
export async function getHeader(file) {
  return await file.slice(0, 392).arrayBuffer()
}

/**
 * Get the audio from a .pti
 * @param {File} file
 * @returns {Promise<ArrayBuffer>}
 */
export async function getAudio(file) {
  return await file.slice(392).arrayBuffer()
}

/**
 * @typedef {Object} HeaderValidationResult
 * @property {boolean} valid
 * @property {string|undefined} message Reason for validation failure
 */

/**
 * Validate a file header against a series of magic numbers.
 *
 * @param {ArrayBuffer} header
 * @returns {HeaderValidationResult}
 */
export function validateHeader(header) {
  if (header.byteLength !== 392) {
    return { valid: false, message: 'Wrong size' }
  }

  const magic = new Uint8Array(header.slice(0, 20))

  for (let i = 0; i < 20; i++) {
    if (!(MAGIC[i].includes?.(magic[i]) ?? MAGIC[i] === magic[i])) {
      return { valid: false, message: `Bad magic ${i}` }
    }
  }

  return { valid: true }
}

/**
 * @typedef {Object} HeaderParseResult
 * @property {number} isWavetable
 * @property {string} name
 * @property {number} sampleLength
 * @property {number} samplePlayback
 * @property {number} wavetableWindowSize
 * @property {number} wavetableTotalPositions
 * @property {number} playbackStart
 * @property {number} loopStart
 * @property {number} loopEnd
 * @property {number} playbackEnd
 * @property {number} wavetablePosition
 * @property {number} cutoff
 * @property {number} resonance
 * @property {number} filterType
 * @property {number} filterEnabled
 * @property {number} tune
 * @property {number} finetune
 * @property {number} volume
 * @property {number} panning
 * @property {number} delaySend
 * @property {Uint16Array} slices
 * @property {number} numSlices
 * @property {number} granularLength
 * @property {number} granularPosition
 * @property {number} granularShape
 * @property {number} granularLoopMode
 * @property {number} reverbSend
 * @property {number} overdrive
 * @property {number} bitDepth
 */

/**
 * Parse a .pti file header.
 *
 * @param {ArrayBuffer} header
 * @returns {HeaderParseResult}
 */
export function parseHeader(header) {
  const slice = header.slice.bind(header)

  const int8a = (start, stop) => new Int8Array(slice(start, stop))
  const uint8a = (start, stop) => new Uint8Array(slice(start, stop))
  const uint16a = (start, stop) => new Uint16Array(slice(start, stop))
  const uint32a = (start, stop) => new Uint32Array(slice(start, stop))
  const float32a = (start, stop) => new Float32Array(slice(start, stop))
  const signedCharAt = (n) => int8a(n, n + 1)[0]
  const charAt = (n) => uint8a(n, n + 1)[0]
  const uint16At = (n) => uint16a(n, n + 2)[0]
  const uint32At = (n) => uint32a(n, n + 4)[0]
  const float32At = (n) => float32a(n, n + 4)[0]

  return {
    get isWavetable() {
      delete this.isWavetable
      return this.isWavetable = charAt(20)
    },

    get name() {
      delete this.name
      return this.name = new TextDecoder('ascii').decode(uint8a(21, 52))
    },

    get sampleLength() {
      delete this.sampleLength
      return this.sampleLength = uint32At(60)
    },

    get wavetableWindowSize() {
      delete this.wavetableWindowSize
      return this.wavetableWindowSize = uint16At(64)
    },

    get wavetableTotalPositions() {
      delete this.waveTableTotalPositions
      return this.waveTableTotalPositions = uint16At(68)
    },

    get samplePlayback() {
      delete this.samplePlayback
      return this.samplePlayback = charAt(76)
    },

    get playbackStart() {
      delete this.playbackStart
      return this.playbackStart = uint16At(78)
    },

    get loopStart() {
      delete this.loopStart
      return this.loopStart = uint16At(80)
    },

    get loopEnd() {
      delete this.loopEnd
      return this.loopEnd = uint16At(82)
    },

    get playbackEnd() {
      delete this.playbackEnd
      return this.playbackEnd = uint16At(84)
    },

    get wavetablePosition() {
      delete this.waveTablePosition
      return this.waveTablePosition = uint16At(88)
    },

    get cutoff() {
      delete this.cutoff
      return this.cutoff = float32At(260)
    },

    get resonance() {
      delete this.resonance
      return this.resonance = float32At(264)
    },

    get filterType() {
      delete this.filterType
      return this.filterType = charAt(268)
    },

    get filterEnabled() {
      delete this.filterEnabled
      return this.filterEnabled = charAt(269)
    },

    get tune() {
      delete this.tune
      return this.tune = signedCharAt(270)
    },

    get finetune() {
      delete this.finetune
      return this.finetune = signedCharAt(271)
    },

    get volume() {
      delete this.volume
      return this.volume = charAt(272)
    },

    get panning() {
      delete this.panning
      return this.panning = charAt(276)
    },

    get delaySend() {
      delete this.delaySend
      return this.delaySend = charAt(278)
    },

    get slices() {
      delete this.slices
      return this.slices = uint16a(280, 280 + this.numSlices * 2)
    },

    get numSlices() {
      delete this.numSlices
      return this.numSlices = charAt(376)
    },

    get granularLength() {
      delete this.granularLength
      return this.granularLength = uint16At(378)
    },

    get granularPosition() {
      delete this.granularPosition
      return this.granularPosition = uint16At(380)
    },

    get granularShape() {
      delete this.granularShape
      return this.granularShape = charAt(382)
    },

    get granularLoopMode() {
      delete this.granularLoopMode
      return this.granularLoopMode = charAt(383)
    },

    get reverbSend() {
      delete this.reverbSend
      return this.reverbSend = charAt(384)
    },

    get overdrive() {
      delete this.overdrive
      return this.overdrive = charAt(385)
    },

    get bitDepth() {
      delete this.bitDepth
      return this.bitDepth = charAt(386)
    },
  }
}

export const isOneShot = samplePlayback => samplePlayback === ONE_SHOT
export const isLoop = samplePlayback => FORWARD_LOOP <= samplePlayback && samplePlayback <= PINGPONG_LOOP
export const isSliced = samplePlayback => SLICE <= samplePlayback && samplePlayback <= BEAT_SLICE
export const isWavetable = samplePlayback => samplePlayback === WAVETABLE
export const isGranular = samplePlayback => samplePlayback === GRANULAR

/**
 * Convert Polyend Tracker sample offset values (Unsigned short)
 * to relative offsets (0.0 - 1.0).
 * @param {Number} offset
 * @returns
 */
export function relOffset(offset) {
  return offset / 65535
}

/**
 * Convert 16 bit wav audio to Float32Array usable by Web Audio.
 * @param {ArrayBuffer} audio
 * @return {Float32Array}
 */
 export function convert(audio) {
  return new Float32Array(
    Array.from(new Int16Array(audio)).map(value => value / 32767)
  )
}
