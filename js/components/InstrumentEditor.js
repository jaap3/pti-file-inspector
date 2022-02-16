import constants from '../modules/constants.js'
import * as ptiTools from '../modules/ptiTools.js'

const { SamplePlayback, FilterType, GranularShape, GranularLoopMode } = constants

const {
  displaydB, displayMilliseconds,
  convertSend, convertVolume,
  relOffset
} = ptiTools

const PLAYBACK_LABELS = {
  [SamplePlayback.ONE_SHOT]: 'One Shot',
  [SamplePlayback.FORWARD_LOOP]: 'Forward Loop',
  [SamplePlayback.BACKWARD_LOOP]: 'Backward Loop',
  [SamplePlayback.PINGPONG_LOOP]: 'PingPong Loop',
  [SamplePlayback.SLICE]: 'Slice',
  [SamplePlayback.BEAT_SLICE]: 'Beat Slice',
  [SamplePlayback.WAVETABLE]: 'Wavetable',
  [SamplePlayback.GRANULAR]: 'Granular'
}

const templateCache = new WeakMap()

/**
 *
 * @param {Node} parent
 * @returns {DocumentFragment}
 */
function getTemplate({ ownerDocument }) {
  if (!templateCache.has(ownerDocument)) {
    templateCache.set(ownerDocument, ownerDocument.getElementById('template:instrument-editor').content)
  }
  return templateCache.get(ownerDocument)
}

/**
 *
 * @param {HTMLInputElement} input
 * @param {Object} header
 * @param {ptiTools.eHeaderParseResult} header.data
 * @param {function} header.watch
 * @param {Object} options
 * @param {Number} options.defaultValue
 * @param {Number} options.wheelDelta
 * @param {function} options.formatValue
 */
function activateSlider(input, { data, watch }, { defaultValue = 0, wheelDelta = 1, formatValue = (value) => value } = {}) {
  const output = input.form[`${input.name}-result`]

  function showValue() {
    input.value = data[input.name]
    output.value = formatValue(data[input.name])
  }

  input.addEventListener('wheel', (e) => {
    e.preventDefault()
    data[input.name] = Math.min(Math.max(input.min, data[input.name] - Math.sign(e.deltaY) * wheelDelta), input.max)
    showValue()
  })

  input.addEventListener('change', () => {
    data[input.name] = input.valueAsNumber
    showValue()
  })

  input.addEventListener('dblclick', () => {
    data[input.name] = defaultValue
    showValue()
  })

  watch({
    afterUpdate(prop) {
      if (prop === input.name) showValue()
    }
  })
  showValue()
}

/**
 *
 * @param {HTMLSelectElement} select
 * @param {ptiTools.HeaderParseResult} headerData
 */
function playbackSelect(select, headerData) {
  const { ownerDocument: d } = select
  Object.entries(SamplePlayback).forEach(([key, value]) => {
    const option = d.createElement('option')
    option.label = PLAYBACK_LABELS[value]
    option.value = key
    option.selected = headerData.samplePlayback === value
    select.add(option)
  })

  select.addEventListener('change', () => {
    headerData[select.name] = SamplePlayback[select.value]
  })
}

export const InstrumentEditor = {
  /**
   * @param {HTMLElement} parent
   * @param {Object} options
   * @param {Object} options.header
   * @param {ptiTools.eHeaderParseResult} options.header.data
   * @param {function} options.header.watch
   * @param {ArrayBuffer} options.audio
   * @returns {Object}
   */
  mount(parent, { header, audio }) {
    const { data } = header

    const frag = getTemplate(parent).cloneNode(true)

    const form = frag.querySelector('form')

    /* Name */
    form.name.value = data.name
    form.name.addEventListener('change', () => header.data.name = form.name.value)

    /* Volume */
    activateSlider(form.volume, header, {
      defaultValue: 50,
      formatValue: (value) => displaydB(convertVolume(value))
    })

    /* Panning */
    activateSlider(form.panning, header, {
      defaultValue: 50,
      formatValue: (value) => {
        const displayValue = value - 50
        return `${displayValue} (${displayValue < 0 ? 'left' : displayValue === 0 ? 'center' : 'right'})`
      }
    })

    /* Tune */
    activateSlider(form.tune, header)

    /* Finetune */
    activateSlider(form.finetune, header)

    /* Playback */
    playbackSelect(form.samplePlayback, data)

    /* Playback start */
    activateSlider(form.playbackStart, header, {
      wheelDelta: 65535 / 1000,
      formatValue: (value) => displayMilliseconds(relOffset(value) * audio.length / 44.1)
    })

    /* Loop start */
    activateSlider(form.loopStart, header, {
      wheelDelta: 65535 / 1000,
      formatValue: (value) => displayMilliseconds(relOffset(value) * audio.length / 44.1)
    })

    /* Loop end */
    activateSlider(form.loopEnd, header, {
      defaultValue: 65534,
      wheelDelta: 65535 / 1000,
      formatValue: (value) => displayMilliseconds(relOffset(value) * audio.length / 44.1)
    })

    /* Playback end */
    activateSlider(form.playbackEnd, header, {
      defaultValue: 65535,
      wheelDelta: 65535 / 1000,
      formatValue: (value) => displayMilliseconds(relOffset(value) * audio.length / 44.1)
    })

    /* Overdrive */
    activateSlider(form.overdrive, header)

    /* bitDepth */
    activateSlider(form.bitDepth, header, { defaultValue: 16 })

    /* Reverb send */
    activateSlider(form.reverbSend, header, {
      formatValue: (value) => displaydB(convertSend(value))
    })

    /* Delay send */
    activateSlider(form.delaySend, header, {
      formatValue: (value) => displaydB(convertSend(value))
    })

    const mounted = Array.from(frag.children).map((el) => parent.appendChild(el))

    return function unmount() {
      mounted.forEach(el => el.remove())
    }
  }
}
