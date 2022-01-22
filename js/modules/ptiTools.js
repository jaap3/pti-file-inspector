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
  5: [5, 4],
  6: [0, 1],
  7: 1,
  8: 9,
  9: 9,
  10: 9,
  11: 9,
  12: 116,
  13: 1,
  14: [0, 102, 110],
  15: [0, 102],
  16: 1,
  17: 0,
  18: 0,
  19: 0
}

export const DEFAULT_HEADER = (() => {
  const header = new ArrayBuffer(392)
  new Uint8Array(header).set(Object.values(MAGIC).map((v) => v[0] ?? v))
  const view = new DataView(header)
  view.setInt16(64, 2048, true)  // Wavetable window size
  view.setInt16(80, 1, true) // Loop start
  view.setInt16(82, 65534, true) // Loop end
  view.setInt16(84, 65535, true) // Playback end
  // Volume automation
  view.setFloat32(92, 1.0, true) // Amount
  view.setFloat32(104, 1.0, true) // Sustain
  view.setUint16(108, 1000, true) // Release
  view.setUint8(111, 1, true) // Envelope
  view.setUint8(212, 2, true) // LFO type
  view.setFloat32(216, 0.5, true) // LFO Amount
  // Panning automation
  view.setFloat32(112, 1.0, true) // Amount
  view.setFloat32(124, 1.0, true) // Sustain
  view.setInt16(128, 1000, true) // Release
  view.setUint8(220, 2, true) // LFO type
  view.setFloat32(224, 0.5, true) // LFO Amount
  // Cutoff automation
  view.setFloat32(132, 1.0, true) // Amount
  view.setFloat32(144, 1.0, true) // Sustain
  view.setInt16(148, 1000, true) // Release
  view.setUint8(228, 2, true) // LFO type
  view.setFloat32(232, 0.5, true) // LFO Amount
  // Wavetable position automation
  view.setFloat32(152, 1.0, true) // Amount
  view.setFloat32(164, 1.0, true) // Sustain
  view.setInt16(168, 1000, true) // Release
  view.setUint8(236, 2, true) // LFO type
  view.setFloat32(240, 0.5, true) // LFO Amount
  // Granular position automation
  view.setFloat32(172, 1.0, true) // Amount
  view.setFloat32(184, 1.0, true) // Sustain
  view.setInt16(188, 1000, true) // Release
  view.setUint8(244, 2, true) // LFO type
  view.setFloat32(248, 0.5, true) // LFO Amount
  // Finetune automation
  view.setFloat32(192, 1.0, true) // Amount
  view.setFloat32(204, 1.0, true) // Sustain
  view.setInt16(208, 1000, true) // Release
  view.setUint8(252, 2, true) // LFO type
  view.setFloat32(256, 0.5, true) // LFO Amount
  // Filter
  view.setFloat32(260, 1.0, true) // Cutoff
  // Parameters
  view.setUint8(272, 50, true) // Volume
  view.setUint8(276, 50, true) // Panning
  // Granular
  view.setInt16(378, 441, true) // Granular length
  // Effects
  view.setUint8(386, 16, true) // Bit depth
  return header
})()

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

function writeHeader(header, headerData) {

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
    audio.byteLength / 2 // 32 -> 16 bit audio
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
  const buffer = new ArrayBuffer(audioLength + 44) // 44 = header size
  const view = new DataView(buffer)
  const uint8Array = new Uint8Array(buffer)
  const uint16Array = new Uint16Array(buffer)
  const textEncoder = new TextEncoder()

  // The ASCII text string "RIFF"
  textEncoder.encodeInto('RIFF', uint8Array)
  // The file size LESS the size of the "RIFF" description (4 bytes)
  // and the size of file description (4 bytes).
  view.setUint32(4, buffer.byteLength - 8, true)
  // The ascii text string "WAVE".
  textEncoder.encodeInto('WAVE', uint8Array.subarray(8))
  // The ascii text string "fmt " (note the trailing space).
  textEncoder.encodeInto('fmt ', uint8Array.subarray(12))
  // The size of the WAV type format (2 bytes) + mono/stereo flag (2 bytes) +
  // sample rate (4 bytes) + bytes/sec (4 bytes) + block alignment (2 bytes) +
  // bits/sample (2 bytes). This is usually 16.
  view.setUint32(16, 16, true) // fmt chunk length
  // Type of WAV format. This is a PCM header, or a value of 0x01.
  view.setUint16(20, 1, true) // PCM
  // mono (0x01) or stereo (0x02)
  view.setUint16(22, 1, true) // mono
  // The sample frequency.
  view.setUint32(24, 44100, true) // sample rate
  // The audio data rate in bytes/sec.
  view.setUint32(28, 44100 * 2, true)
  // The block alignment.
  view.setUint16(32, 2, true)
  // The number of bits per sample.
  view.setUint16(34, 16, true)
  // The ascii text string "data".
  textEncoder.encodeInto('data', uint8Array.subarray(36))
  // Number of bytes of data is included in the data section.
  view.setUint32(40, audioLength, true)
  // The audio data.
  for (let i = 0; i < audio.length; i++) {
    uint16Array[44 + i] = audio[i] * 32767
  }

  return new Blob([buffer], { 'type': 'audio/wav' });
}
