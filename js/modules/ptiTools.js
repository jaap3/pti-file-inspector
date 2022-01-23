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
  const headerData = {}

  const newHeader = header.slice(0)
  const view = new DataView(newHeader)

  const asciiEncoder = new TextEncoder('ascii')

  return {
    get isWavetable() {
      return headerData.isWavetable ?? (headerData.isWavetable = view.getUint8(20))
    },

    set isWavetable(value) {
      view.setUint8(20, value)
      headerData.isWavetable = value
    },

    get name() {
      return headerData.name ?? (
        headerData.name = new TextDecoder('ascii').decode(
          new Uint8Array(newHeader, 21, 31)
        ).replaceAll('\x00', '')
      )
    },

    /**
     * @param {string} value
     */
    set name(value) {
      new Uint8Array(newHeader, 21, 31).set(asciiEncoder.encode(value.padEnd(31, '\x00')))
      headerData.name = value
    },

    get sampleLength() {
      return headerData.sampleLength ?? (headerData.sampleLength = view.getUint32(60, true))
    },

    set sampleLength(value) {
      view.setUint32(60, value, true)
      headerData.sampleLength = value
    },

    get wavetableWindowSize() {
      return headerData.wavetableWindowSize ?? (headerData.wavetableWindowSize = view.getUint16(64, true))
    },

    set wavetableWindowSize(value) {
      view.setUint16(64, value, true)
      headerData.wavetableWindowSize = value
    },

    get wavetableTotalPositions() {
      return headerData.waveTableTotalPositions ?? (headerData.waveTableTotalPositions = view.getUint16(68, true))
    },

    set wavetableTotalPositions(value) {
      view.setUint16(68, value, true)
      headerData.waveTableTotalPositions = value
    },

    get samplePlayback() {
      return headerData.samplePlayback ?? (headerData.samplePlayback = view.getUint8(76))
    },

    set samplePlayback(value) {
      view.setUint8(76, value)
      headerData.samplePlayback = value
    },

    get playbackStart() {
      return headerData.playbackStart ?? (headerData.playbackStart = view.getUint16(78, true))
    },

    set playbackStart(value) {
      view.setUint16(78, value, true)
      headerData.playbackStart = value
    },

    get loopStart() {
      return headerData.loopStart ?? (headerData.loopStart = view.getUint16(80, true))
    },

    set loopStart(value) {
      view.setUint16(80, value, true)
      headerData.loopStart = value
    },

    get loopEnd() {
      return headerData.loopEnd ?? (headerData.loopEnd = view.getUint16(82, true))
    },

    set loopEnd(value) {
      view.setUint16(82, value, true)
      headerData.loopEnd = value
    },

    get playbackEnd() {
      return headerData.playbackEnd ?? (headerData.playbackEnd = view.getUint16(84, true))
    },

    set playbackEnd(value) {
      view.setUint16(84, value, true)
      headerData.playbackEnd = value
    },

    get wavetablePosition() {
      return headerData.waveTablePosition ?? (headerData.waveTablePosition = view.getUint16(88, true))
    },

    set wavetablePosition(value) {
      view.setUint16(88, value, true)
      headerData.waveTablePosition = value
    },

    get cutoff() {
      return headerData.cutoff ?? (headerData.cutoff = view.getFloat32(260, true))
    },

    set cutoff(value) {
      view.setFloat32(260, value, true)
      headerData.cutoff = value
    },

    get resonance() {
      return headerData.resonance ?? (headerData.resonance = view.getFloat32(264, true))
    },

    set resonance(value) {
      view.setFloat32(264, value, true)
      headerData.resonance = value
    },

    get filterType() {
      return headerData.filterType ?? (headerData.filterType = view.getUint8(268))
    },

    set filterType(value) {
      view.setUint8(268, value)
      headerData.filterType = value
    },

    get filterEnabled() {
      return headerData.filterEnabled ?? (headerData.filterEnabled = view.getUint8(269))
    },

    set filterEnabled(value) {
      view.setUint8(269, value)
      headerData.filterEnabled = value
    },

    get tune() {
      return headerData.tune ?? (headerData.tune = view.getInt8(270))
    },

    set tune(value) {
      view.setInt8(270, value)
      headerData.tune = value
    },

    get finetune() {
      return headerData.finetune ?? (headerData.finetune = view.getInt8(271))
    },

    set finetune(value) {
      view.setInt8(271, value)
      headerData.finetune = value
    },

    get volume() {
      return headerData.volume ?? (headerData.volume = view.getUint8(272))
    },

    set volume(value) {
      view.setUint8(272, value)
      headerData.volume = value
    },

    get panning() {
      return headerData.panning ?? (headerData.panning = view.getUint8(276))
    },

    set panning(value) {
      view.setUint8(276, value)
      headerData.panning = value
    },

    get delaySend() {
      return headerData.delaySend ?? (headerData.delaySend = view.getUint8(278))
    },

    set delaySend(value) {
      view.setUint8(278, value)
      headerData.delaySend = value
    },

    get slices() {
      return headerData.slices ?? (headerData.slices = new Uint16Array(newHeader, 280, this.numSlices))
    },

    set slices(value) {
      // TODO: Figure this out
      // this.numSlices = value.length
      // new Uint16Array(newHeader, 280, this.numSlices)
    },

    get numSlices() {
      return headerData.numSlices ?? (headerData.numSlices = view.getUint8(376))
    },

    set numSlices(value) {
      view.setUint8(376, value)
      headerData.numSlices = value
    },

    get granularLength() {
      return headerData.granularLength ?? (headerData.granularLength = view.getUint16(378, true))
    },

    set granularLength(value) {
      view.setUint16(378, value, true)
      headerData.granularLength = value
    },

    get granularPosition() {
      return headerData.granularPosition ?? (headerData.granularPosition = view.getUint16(380, true))
    },

    set granularPosition(value) {
      view.setUint16(380, value, true)
      headerData.granularPosition = value
    },

    get granularShape() {
      return headerData.granularShape ?? (headerData.granularShape = view.getUint8(382))
    },

    set granularShape(value) {
      view.setUint8(382, value)
      headerData.granularShape = value
    },

    get granularLoopMode() {
      return headerData.granularLoopMode ?? (headerData.granularLoopMode = view.getUint8(383))
    },

    set granularLoopMode(value) {
      view.setUint8(383, value)
      headerData.granularLoopMode = value
    },

    get reverbSend() {
      return headerData.reverbSend ?? (headerData.reverbSend = view.getUint8(384))
    },

    set reverbSend(value) {
      view.setUint8(384, value)
      headerData.reverbSend = value
    },

    get overdrive() {
      return headerData.overdrive ?? (headerData.overdrive = view.getUint8(385))
    },

    set overdrive(value) {
      view.setUint8(385, value)
      headerData.overdrive = value
    },

    get bitDepth() {
      return headerData.bitDepth ?? (headerData.bitDepth = view.getUint8(386))
    },

    set bitDepth(value) {
      view.setUint8(386, value)
      headerData.bitDepth = value
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
