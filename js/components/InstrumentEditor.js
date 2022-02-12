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
 * @param {ptiTools.ReactiveHeaderParseResult} headerData
 * @param {Object} options
 * @param {Number} options.defaultValue
 * @param {Number} options.wheelDelta
 * @param {function} options.formatValue
 */
function activateSlider(input, headerData, { defaultValue = 0, wheelDelta = 1, formatValue = (value) => value } = {}) {
  const { data } = headerData
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

  headerData.watch({
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
   * @param {ptiTools.ReactiveHeaderParseResult} options.headerData
   * @param {ArrayBuffer} options.audio
   * @returns {Object}
   */
  mount(parent, { headerData, audio }) {
    const frag = getTemplate(parent).cloneNode(true)

    const form = frag.querySelector('form')

    /* Name */
    form.name.value = headerData.data.name
    form.name.addEventListener('change', () => headerData.data.name = form.name.value)

    /* Volume */
    activateSlider(form.volume, headerData, {
      defaultValue: 50,
      formatValue: (value) => displaydB(convertVolume(value))
    })

    /* Panning */
    activateSlider(form.panning, headerData, {
      defaultValue: 50,
      formatValue: (value) => {
        const displayValue = value - 50
        return `${displayValue} (${displayValue < 0 ? 'left' : displayValue === 0 ? 'center' : 'right'})`
      }
    })

    /* Tune */
    activateSlider(form.tune, headerData)

    /* Finetune */
    activateSlider(form.finetune, headerData)

    /* Playback */
    playbackSelect(form.samplePlayback, headerData.data)

    /* Playback start */
    activateSlider(form.playbackStart, headerData, {
      wheelDelta: 65535 / 1000,
      formatValue: (value) => displayMilliseconds(relOffset(value) * audio.length / 44.1)
    })

    /* Loop start */
    activateSlider(form.loopStart, headerData, {
      wheelDelta: 65535 / 1000,
      formatValue: (value) => displayMilliseconds(relOffset(value) * audio.length / 44.1)
    })

    /* Loop end */
    activateSlider(form.loopEnd, headerData, {
      defaultValue: 65534,
      wheelDelta: 65535 / 1000,
      formatValue: (value) => displayMilliseconds(relOffset(value) * audio.length / 44.1)
    })

    /* Playback end */
    activateSlider(form.playbackEnd, headerData, {
      defaultValue: 65535,
      wheelDelta: 65535 / 1000,
      formatValue: (value) => displayMilliseconds(relOffset(value) * audio.length / 44.1)
    })

    /* Overdrive */
    activateSlider(form.overdrive, headerData)

    /* bitDepth */
    activateSlider(form.bitDepth, headerData, { defaultValue: 16 })

    /* Reverb send */
    activateSlider(form.reverbSend, headerData, {
      formatValue: (value) => displaydB(convertSend(value))
    })

    /* Delay send */
    activateSlider(form.delaySend, headerData, {
      formatValue: (value) => displaydB(convertSend(value))
    })

    const mounted = Array.from(frag.children).map((el) => parent.appendChild(el))

    return function unmount() {
      mounted.forEach(el => el.remove())
    }
  }
}
