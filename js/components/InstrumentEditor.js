import constants from '../modules/constants.js'
import * as ptiTools from '../modules/ptiTools.js'

const {
  SamplePlayback, SAMPLE_PLAYBACK_LABELS,
  FilterType, FILTER_TYPE_LABELS,
  GranularLoopMode, GRANULAR_LOOP_MODE_LABELS,
  GranularShape, GRANULAR_SHAPE_LABELS
} = constants

const {
  convertSend, convertVolume,
  displaydB, displayMilliseconds,
  isGranular, isLoop, isOneShot, isSliced, isWavetable,
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
 * @param {ptiTools.HeaderParseResult} data
 * @param {Object} options
 * @param {Object} coerce
 * @param {function} coerce.write Manipulate data on write (user input -> header)
 * @param {function} coerce.read Manipulate data on read (header data -> input value)
 * @returns
 */
function activateInput(input, { data, watch }, coerce = { write: (value) => value, read: (value) => value }) {
  input.addEventListener('input', () => {
    data[input.name] = coerce.write(input.valueAsNumber)
  })

  watch({
    afterUpdate(prop) {
      if (prop === input.name) {
        input.value = coerce.read(data[input.name])
      }
    }
  })

  input.value = coerce.read(data[input.name])

  return input
}

/**
 *
 * @param {HTMLInputElement} input
 * @param {function} isVisible
 * @param {Object} header
 * @param {ptiTools.HeaderParseResult} header.data
 * @param {function} header.watch
 */
function withVisibility(input, isVisible, { data, watch }) {
  watch({
    afterUpdate(prop) {
      input.parentNode.hidden = !isVisible(data)
    }
  })

  input.parentNode.hidden = !isVisible(data)

  return input
}

/**
 *
 * @param {HTMLInputElement} input
 * @param {function} formatValue
 * @param {Object} header
 * @param {ptiTools.HeaderParseResult} header.data
 * @param {function} header.watch
 */
function withOutput(input, formatValue, { data, watch }) {
  const output = input.form[`${input.name}-result`]

  function showValue() {
    output.value = formatValue(data[input.name])
  }

  watch({
    afterUpdate(prop) {
      if (prop === input.name) showValue()
    }
  })

  showValue()

  return input
}

/**
 *
 * @param {HTMLInputElement} input
 * @param {Object} header
 * @param {ptiTools.HeaderParseResult} header.data
 * @param {function} header.watch
 * @param {Object} options
 * @param {Number} options.defaultValue
 * @param {Number} options.wheelDelta
 * @param {function} options.formatValue
 * @param {function} options.isVisible
 */
function activateSlider(input, header, { defaultValue = 0, wheelDelta = 1, formatValue = (value) => value, isVisible = () => true } = {}) {
  const { data } = header

  function incrementValue(sign) {
    data[input.name] = Math.min(Math.max(input.min, data[input.name] + sign * wheelDelta), input.max)
  }

  input.addEventListener('wheel', (e) => {
    // Only scroll when focused
    if (e.currentTarget.ownerDocument.activeElement !== input) return
    e.preventDefault()
    incrementValue(Math.sign(-e.deltaY))
  })

  input.addEventListener('keydown', (evt) => {
    switch (evt.code) {
      case 'ArrowUp':
      case 'ArrowRight':
        incrementValue(1)
        break
      case 'ArrowDown':
      case 'ArrowLeft':
        incrementValue(-1)
        break
      default:
    }
  })

  input.addEventListener('dblclick', () => {
    data[input.name] = defaultValue
  })

  withVisibility(withOutput(activateInput(input, header), formatValue, header), isVisible, header)
}

/**
 *
 * @param {Element} template
 * @param {*} audio
 * @param {Object} header
 * @param {Function} header.watch
 * @param {ptiTools.HeaderParseResult} header.data
 */
function activateSlicer(template, audio, { watch, data }) {
  for (let slice = 0; slice < data.numSlices; slice++) {
    const sliceRow = template.cloneNode(true)
    const label = sliceRow.querySelector('label')
    const input = sliceRow.querySelector('input')
    const output = sliceRow.querySelector('output')

    const name = input.name
    label.textContent = `${label.textContent} ${slice + 1}`
    label.htmlFor = output.htmlFor = input.id = input.id.replace(name, `${name}.${slice}`)
    output.name = output.name.replace(name, `${name}.${slice}`)
    input.name = `${name}.${slice}`

    template.before(sliceRow)

    activateSlider(input, { watch, data }, {
      defaultValue: 0,
      wheelDelta: 65535 / 1000,
      formatValue: (value) => displayMilliseconds(relOffset(value) * audio.length / 44.1),
      isVisible({ samplePlayback, activeSlice }) {
        return isSliced(samplePlayback) && slice === activeSlice
      }
    })
  }
  template.remove()
}

/**
 *
 * @param {HTMLSelectElement} select
 * @param {Object} options
 * @param {Object} labels
 * @param {Object} header
 * @param {function} header.watch
 * @param {ptiTools.HeaderParseResult} header.data
 * @param {Object} options
 * @param {function} options.isVisible
 */
function activateSelect(select, options, labels, { watch, data }, { isVisible = () => true } = {}) {
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

  withVisibility(select, isVisible, { watch, data })
}

/**
 *
 * @param {Document} document
 * @param {ArrayBuffer} file
 * @param {string} name
 */
function downloadFile(document, file, name) {
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.setAttribute('download', name)
  a.setAttribute('href', url)
  a.setAttribute('hidden', '')
  document.documentElement.appendChild(a)
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Fieldset navigation
 * @param {HTMLNavElement} nav
 */
function activateNavigation(nav) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(({ target, isIntersecting }) => {
      const tab = nav.querySelector(`[aria-controls=${target.id}]`)
      if (isIntersecting) {
        tab.setAttribute('aria-selected', 'true')
      } else {
        tab.removeAttribute('aria-selected')
      }
    })
  }, {
    root: nav.parentNode,
    threshold: .5
  })

  // TODO: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/tab_role
  const buttons = nav.querySelectorAll('[role=tab]')

  buttons.forEach((button, idx) => {
    const tab = button.ownerDocument.getElementById(button.getAttribute('aria-controls'))

    observer.observe(tab)

    button.addEventListener('click', () => {
      tab.parentNode.scrollTo(0, tab.querySelector('fieldset').offsetLeft)
      tab.querySelector('fieldset').elements[0].focus()
    })
  })

  return {
    disconnect: () => observer.disconnect()
  }
}

export const InstrumentEditor = {
  /**
   * @param {HTMLElement} parent
   * @param {Object} options
   * @param {Object} options.header
   * @param {ptiTools.eHeaderParseResult} options.header.data
   * @param {function} options.header.watch
   * @param {ArrayBuffer} options.audio
   * @param {HTMLDialogElement} loaderDialog
   * @returns {Object}
   */
  mount(parent, { header, audio, loaderDialog }) {
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
      formatValue: (value) => displayMilliseconds(relOffset(value) * audio.length / 44.1),
      isVisible({ samplePlayback }) {
        return isOneShot(samplePlayback) || isLoop(samplePlayback)
      }
    })

    /* Loop start */
    activateSlider(form.loopStart, header, {
      wheelDelta: 65535 / 1000,
      formatValue: (value) => displayMilliseconds(relOffset(value) * audio.length / 44.1),
      isVisible({ samplePlayback }) {
        return isLoop(samplePlayback)
      }
    })

    /* Loop end */
    activateSlider(form.loopEnd, header, {
      defaultValue: 65534,
      wheelDelta: 65535 / 1000,
      formatValue: (value) => displayMilliseconds(relOffset(value) * audio.length / 44.1),
      isVisible({ samplePlayback }) {
        return isLoop(samplePlayback)
      }
    })

    /* Playback end */
    activateSlider(form.playbackEnd, header, {
      defaultValue: 65535,
      wheelDelta: 65535 / 1000,
      formatValue: (value) => displayMilliseconds(relOffset(value) * audio.length / 44.1),
      isVisible({ samplePlayback }) {
        return isOneShot(samplePlayback) || isLoop(samplePlayback)
      }
    })

    /* Slice offset */
    activateSlicer(form.slices.parentNode, audio, header)

    /* Active slice */
    withVisibility(
      withOutput(
        activateInput(form.activeSlice, header, {
          write(value) {
            return value - 1
          },
          read(value) {
            return value + 1
          }
        }),
        (value) => `${value + 1} of ${header.data.numSlices}`,
        header
      ),
      ({ samplePlayback }) => isSliced(samplePlayback),
      header
    )

    /* Wavetable window size */
    activateSlider(form.wavetableWindowSize, header, {
      defaultValue: 2048,
      isVisible({ samplePlayback }) {
        return isWavetable(samplePlayback)
      }
    })

    /* Wavetable position */
    activateSlider(form.wavetablePosition, header, {
      isVisible({ samplePlayback }) {
        return isWavetable(samplePlayback)
      }
    })

    /* Granular length */
    activateSlider(form.granularLength, header, {
      formatValue: (value) => displayMilliseconds(value / 44.1),
      isVisible({ samplePlayback }) {
        return isGranular(samplePlayback)
      }
    })

    /* Granular position */
    activateSlider(form.granularPosition, header, {
      defaultValue: 441,
      formatValue: (value) => displayMilliseconds(value / 44.1),
      isVisible({ samplePlayback }) {
        return isGranular(samplePlayback)
      }
    })

    /* Shape */
    activateSelect(form.granularShape, GranularShape, GRANULAR_SHAPE_LABELS, header, {
      isVisible({ samplePlayback }) {
        return isGranular(samplePlayback)
      }
    })

    /* Loop mode */
    activateSelect(form.granularLoopMode, GranularLoopMode, GRANULAR_LOOP_MODE_LABELS, header, {
      isVisible({ samplePlayback }) {
        return isGranular(samplePlayback)
      }
    })

    /* Filter enabled */
    activateSelect(form.filterEnabled, { true: 1, false: 0 }, { 1: 'Yes', 0: 'No' }, header)

    /* Filter type */
    activateSelect(form.filterType, FilterType, FILTER_TYPE_LABELS, header, {
      isVisible({ filterEnabled }) {
        return filterEnabled
      }
    })

    /* Cutoff */
    activateSlider(form.cutoff, header, {
      defaultValue: 1.0,
      wheelDelta: 0.01,
      formatValue: (value) => (value * 100).toFixed(),
      isVisible({ filterEnabled }) {
        return filterEnabled
      }
    })

    /* Resonance */
    activateSlider(form.resonance, header, {
      wheelDelta: 0.04,
      formatValue: (value) => (value / 4.3 * 100).toFixed(),
      isVisible({ filterEnabled }) {
        return filterEnabled
      }
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

    /* Load */
    form.loadInstrument.addEventListener('click', (evt) => {
      loaderDialog.hidden = !loaderDialog.hidden

      evt.currentTarget.setAttribute('aria-pressed', !loaderDialog.hidden)
      if (!loaderDialog.hidden) {
        setTimeout(() => {
          loaderDialog.scrollIntoView()
          loaderDialog.querySelector('input').focus()
        }, 0)
      }

    })

    /* Export */
    form.exportPti.addEventListener('click', () => {
      downloadFile(
        parent.ownerDocument,
        ptiTools.getPtiFile(audio, data),
        `${data.name}.pti`
      )
    })
    form.exportWav.addEventListener('click', () => {
      downloadFile(
        parent.ownerDocument,
        ptiTools.getWavFile(audio, data),
        `${data.name}.wav`
      )
    })

    /**
     * TODO: Get player instance
    form.playSample.addEventListener('click', (evt) => {
      const button = evt.currentTarget
      const labels = button.querySelectorAll('span')

      button.setAttribute('aria-pressed', 'true')
      labels[0].setAttribute('hidden', '')
      labels[1].removeAttribute('hidden')

      player.playSample(() => {
        button.setAttribute('aria-pressed', 'false')
        labels[0].removeAttribute('hidden')
        labels[1].setAttribute('hidden', '')
        player.stop()
      })
    })
    */

    const mounted = Array.from(frag.children).map((el) => parent.appendChild(el))

    const navigation = activateNavigation(nav)

    parent.removeAttribute('hidden')

    return function unmount() {
      navigation.disconnect()
      mounted.forEach(el => el.remove())
    }
  }
}
