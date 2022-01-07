export const SamplePlayback = Object.freeze({
  ONE_SHOT: 0,
  FORWARD_LOOP: 1,
  BACKWARD_LOOP: 2,
  PINGPONG_LOOP: 3,
  SLICE: 4,
  BEAT_SLICE: 5,
  WAVETABLE: 6,
  GRANULAR: 7
})

export const GranularShape = Object.freeze({
  SQUARE: 0,
  TRIANGLE: 1,
  GAUSS: 2
})

export const GranularLoopMode = Object.freeze({
  FORWARD: 0,
  BACKWARD: 1,
  PINGPONG: 2
})

export const FilterType = Object.freeze({
  LOW_PASS: 0,
  HIGH_PASS: 1,
  BAND_PASS: 2
})
