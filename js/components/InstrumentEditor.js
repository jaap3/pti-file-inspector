import * as ptiTools from '../modules/ptiTools.js'

const { displaydB, convertVolume } = ptiTools

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

function activateSlider(input, headerData, { defaultValue = 0, formatValue = (value) => value } = {}) {
  const output = input.form[`${input.name}-result`]

  function showValue() {
    input.value = headerData[input.name]
    output.value = formatValue(headerData[input.name])
  }

  input.addEventListener('wheel', (e) => {
    headerData[input.name] = Math.min(Math.max(input.min, headerData[input.name] - Math.sign(e.deltaY) * 1), input.max)
    showValue()
  })

  input.addEventListener('change', () => {
    headerData[input.name] = input.valueAsNumber
    showValue()
  })

  input.addEventListener('dblclick', () => {
    headerData[input.name] = defaultValue
    showValue()
  })

  showValue()
}

export const InstrumentEditor = {
  /**
   * @param {HTMLElement} parent
   * @param {Object} options
   * @param {ptiTools.HeaderParseResult} options.headerData
   * @param {ArrayBuffer} audio
   * @returns
   */
  mount(parent, { headerData, audio }) {
    const frag = getTemplate(parent).cloneNode(true)

    const form = frag.querySelector('form')

    /* Name */
    form.name.value = headerData.name
    form.name.addEventListener('change', () => headerData.name = form.name.value)

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

    const mounted = Array.from(frag.children).map((el) => parent.appendChild(el))

    return function unmount() {
      mounted.forEach(el => el.remove())
    }
  }
}
