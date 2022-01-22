const SamplePlayback = Object.freeze({
  ONE_SHOT: 0,
  FORWARD_LOOP: 1,
  BACKWARD_LOOP: 2,
  PINGPONG_LOOP: 3,
  SLICE: 4,
  BEAT_SLICE: 5,
  WAVETABLE: 6,
  GRANULAR: 7
})

const GranularShape = Object.freeze({
  SQUARE: 0,
  TRIANGLE: 1,
  GAUSS: 2
})

const GranularLoopMode = Object.freeze({
  FORWARD: 0,
  BACKWARD: 1,
  PINGPONG: 2
})

const FilterType = Object.freeze({
  LOW_PASS: 0,
  HIGH_PASS: 1,
  BAND_PASS: 2
})

// https://github.com/jaap3/pti-file-format/blob/main/pti.rst#header
const MAGIC = Object.freeze({
  0: 84, // T
  1: 73, // I
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
})

/**
 * @instance
 */
const lazyDefaultPtiHeaderFactory = (() => {
  /** @type {ArrayBuffer} */
  let HEADER

  /**
   * @returns {ArrayBuffer}
   */
  function factory() {
    const header = new ArrayBuffer(392)

    // Copy the magic bytes
    new Uint8Array(header).set(Object.values(MAGIC).map((v) => v[0] ?? v))

    const view = new DataView(header)

    // Set the defaults
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
  }

  return {
    get HEADER() {
      return HEADER ?? (HEADER = factory())
    }
  }
})()

export default {
  SamplePlayback,
  GranularShape,
  GranularLoopMode,
  FilterType,
  MAGIC,
  get DEFAULT_PTI_HEADER() { return lazyDefaultPtiHeaderFactory.HEADER }
}
