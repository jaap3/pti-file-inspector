import constants from '../modules/constants.js'
import * as ptiTools from '../modules/ptiTools.js'

const {
  SamplePlayback, SAMPLE_PLAYBACK_LABELS,
  FilterType, FILTER_TYPE_LABELS,
  GranularLoopMode, GRANULAR_LOOP_MODE_LABELS,
  GranularShape, GRANULAR_SHAPE_LABELS
} = constants

const {
  displaydB, displayMilliseconds,
  convertSend, convertVolume,
  relOffset
} = ptiTools

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

  input.addEventListener('input', () => {
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
 * @param {Object} options
 * @param {Object} labels
 * @param {Object} header
 * @param {ptiTools.HeaderParseResult} header.data
 */
function activateSelect(select, options, labels, { data }) {
  const { ownerDocument: d } = select
  Object.entries(options).forEach(([key, value]) => {
    const option = d.createElement('option')
    option.label = labels[value]
    option.value = key
    option.selected = data[select.name] === value
    select.add(option)
  })

  select.addEventListener('change', () => {
    data[select.name] = options[select.value]
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

    /** @type {HTMLNavElement} */
    const nav = frag.querySelector('nav')

    /** @type {HTMLFormElement} */
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
    activateSelect(form.samplePlayback, SamplePlayback, SAMPLE_PLAYBACK_LABELS, header)

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

    /* Slice offset */
    /* TODO: make this work */
    activateSlider(form.sliceOffset, header, {
      defaultValue: 0,
      wheelDelta: 65535 / 1000,
      formatValue: (value) => displayMilliseconds(relOffset(value) * audio.length / 44.1)
    })

    /* Wavetable window size */
    activateSlider(form.wavetableWindowSize, header, {
      defaultValue: 2048
    })

    /* Wavetable position */
    activateSlider(form.wavetablePosition, header)

    /* Granular length */
    activateSlider(form.granularLength, header, {
      formatValue: (value) => displayMilliseconds(value / 44.1)
    })

    /* Granular position */
    activateSlider(form.granularPosition, header, {
      defaultValue: 441,
      formatValue: (value) => displayMilliseconds(value / 44.1)
    })

    /* Shape */
    activateSelect(form.granularShape, GranularShape, GRANULAR_SHAPE_LABELS, header)

    /* Loop mode */
    activateSelect(form.granularLoopMode, GranularLoopMode, GRANULAR_LOOP_MODE_LABELS, header)

    /* Filter type */
    activateSelect(form.filterType, FilterType, FILTER_TYPE_LABELS, header)

    /* Cutoff */
    activateSlider(form.cutoff, header, {
      defaultValue: 1.0,
      wheelDelta: 0.01,
      formatValue: (value) => (value * 100).toFixed()
    })

    /* Resonance */
    activateSlider(form.resonance, header, {
      wheelDelta: 0.04,
      formatValue: (value) => (value / 4.3 * 100).toFixed()
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

    /* Fieldset navigation */
    const buttons = nav.querySelectorAll('[role=tab]')
    buttons.forEach((button, idx) => {
      if (idx === 0) {
        button.setAttribute('aria-selected', 'true')
      }
      button.addEventListener('click', (evt) => {
        evt.preventDefault()
        /** @type {HTMLButtonElement} */
        const button = evt.currentTarget
        buttons.forEach(el => el.removeAttribute('aria-selected'))
        button.setAttribute('aria-selected', 'true')
        /** @type {Element} */
        const tab = button.ownerDocument.getElementById(button.getAttribute('aria-controls'))
        tab.parentNode.scrollTo(tab.offsetLeft, 0)
        tab.querySelector('fieldset').elements[0].focus()
      })
    })

    const mounted = Array.from(frag.children).map((el) => parent.appendChild(el))

    parent.removeAttribute('hidden')

    return function unmount() {
      mounted.forEach(el => el.remove())
    }
  }
}
