import constants from './constants.js'

const MAGIC = constants.MAGIC

const {
  ONE_SHOT,
  FORWARD_LOOP, PINGPONG_LOOP,
  SLICE, BEAT_SLICE,
  WAVETABLE, GRANULAR
} = constants.SamplePlayback

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
 * @property {ArrayBuffer} buffer Header data including parameter edits
 */

/**
 * Parse a .pti file header.
 *
 * @param {ArrayBuffer} header
 * @returns {HeaderParseResult}
 */
export function parseHeader(header) {
  const newHeader = header.slice(0)
  const headerData = {}

  const asciiEncoder = new TextEncoder('ascii')
  const view = new DataView(newHeader)
  const int8a = (start, length) => new Int8Array(newHeader, start, length)
  const uint8a = (start, length) => new Uint8Array(newHeader, start, length)
  const uint16a = (start, length) => new Uint16Array(newHeader, start, length)
  const float32a = (start, length) => new Float32Array(newHeader, start, length)
  const signedCharAt = (n) => int8a(n, 1)[0]
  const charAt = (n) => uint8a(n, 1)[0]
  const uint16At = (n) => uint16a(n, 1)[0]
  const float32At = (n) => float32a(n, 1)[0]

  return {
    get isWavetable() {
      return headerData.isWavetable ?? (headerData.isWavetable = charAt(20))
    },

    get name() {
      return headerData.name ?? (headerData.name = new TextDecoder('ascii').decode(uint8a(21, 32)))
    },

    set name(value) {
      headerData.name = value
      uint8a(21, 32).set(asciiEncoder.encode(value))
    },

    get sampleLength() {
      return headerData.sampleLength ?? (headerData.sampleLength = view.getUint32(60, true))
    },

    set sampleLength(value) {
      headerData.sampleLength = value
      view.setUint32(60, value, true)
    },

    get wavetableWindowSize() {
      return headerData.wavetableWindowSize ?? (headerData.wavetableWindowSize = uint16At(64))
    },

    get wavetableTotalPositions() {
      return headerData.waveTableTotalPositions ?? (headerData.waveTableTotalPositions = uint16At(68))
    },

    get samplePlayback() {
      return headerData.samplePlayback ?? (headerData.samplePlayback = charAt(76))
    },

    get playbackStart() {
      return headerData.playbackStart ?? (headerData.playbackStart = uint16At(78))
    },

    get loopStart() {
      return headerData.loopStart ?? (headerData.loopStart = uint16At(80))
    },

    get loopEnd() {
      return headerData.loopEnd ?? (headerData.loopEnd = uint16At(82))
    },

    get playbackEnd() {
      return headerData.playbackEnd ?? (headerData.playbackEnd = uint16At(84))
    },

    get wavetablePosition() {
      return headerData.waveTablePosition ?? (headerData.waveTablePosition = uint16At(88))
    },

    get cutoff() {
      return headerData.cutoff ?? (headerData.cutoff = float32At(260))
    },

    get resonance() {
      return headerData.resonance ?? (headerData.resonance = float32At(264))
    },

    get filterType() {
      return headerData.filterType ?? (headerData.filterType = charAt(268))
    },

    get filterEnabled() {
      return headerData.filterEnabled ?? (headerData.filterEnabled = charAt(269))
    },

    get tune() {
      return headerData.tune ?? (headerData.tune = signedCharAt(270))
    },

    get finetune() {
      return headerData.finetune ?? (headerData.finetune = signedCharAt(271))
    },

    get volume() {
      return headerData.volume ?? (headerData.volume = charAt(272))
    },

    get panning() {
      return headerData.panning ?? (headerData.panning = charAt(276))
    },

    get delaySend() {
      return headerData.delaySend ?? (headerData.delaySend = charAt(278))
    },

    get slices() {
      return headerData.slices ?? (headerData.slices = uint16a(280, this.numSlices))
    },

    get numSlices() {
      return headerData.numSlices ?? (headerData.numSlices = charAt(376))
    },

    get granularLength() {
      return headerData.granularLength ?? (headerData.granularLength = uint16At(378))
    },

    get granularPosition() {
      return headerData.granularPosition ?? (headerData.granularPosition = uint16At(380))
    },

    get granularShape() {
      return headerData.granularShape ?? (headerData.granularShape = charAt(382))
    },

    get granularLoopMode() {
      return headerData.granularLoopMode ?? (headerData.granularLoopMode = charAt(383))
    },

    get reverbSend() {
      return headerData.reverbSend ?? (headerData.reverbSend = charAt(384))
    },

    get overdrive() {
      return headerData.overdrive ?? (headerData.overdrive = charAt(385))
    },

    get bitDepth() {
      return headerData.bitDepth ?? (headerData.bitDepth = charAt(386))
    },

    get buffer() {
      return newHeader
    }
  }
}

/**
 * Get the header from a .pti
 * @param {File} file
 * @returns {HeaderParseResult}
 */
export function getDefeaultHeader() {
  return parseHeader(constants.DEFAULT_PTI_HEADER)
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

/**
 * @param {Float32Array} audio
 * @param {HeaderParseResult} headerData
 * @returns {Blob}
 */
export function getPtiFile(audio, headerData) {
  const buffer = new ArrayBuffer(
    392 + // header size
    audio.byteLength / 2 // From 32 -> 16 bit
  )

  // Write header
  new Uint8Array(buffer).set(new Uint8Array(headerData.buffer))

  // Write audio
  new Int16Array(buffer).set(Array.from(audio).map(v => v * 32767), 392 / 2)

  return new Blob([buffer], { 'type': 'application/octet-stream' });
}


/**
 * @param {Float32Array} audio
 * @returns {Blob}
 */
export function getWavFile(audio) {
  const audioLength = audio.byteLength / 2 // From 32 -> 16 bit
  const buffer = new ArrayBuffer(
    44 + // header size
    audioLength
  )

  // Write header
  new Uint8Array(buffer).set(new Uint8Array(constants.DEFAULT_WAV_HEADER))
  const view = new DataView(buffer)
  // Number of bytes of data is included in the data section.
  view.setUint32(40, audioLength, true)

  // Write audio
  new Int16Array(buffer).set(Array.from(audio).map(v => v * 32767), 44 / 2)

  return new Blob([buffer], { 'type': 'audio/wav' });
}
