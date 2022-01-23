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
    const showVolume = () => {
      form.volume.valueAsNumber = headerData.volume
      form['volume-result'].value = displaydB(convertVolume(headerData.volume))
    }
    showVolume()

    form.volume.addEventListener('wheel', (e) => {
      headerData.volume = Math.min(Math.max(0, headerData.volume - Math.sign(e.deltaY) * 1), 100)
      showVolume()
    })

    form.volume.addEventListener('change', () => {
      headerData.volume = form.volume.valueAsNumber
      showVolume()
    })

    form.volume.addEventListener('dblclick', () => {
      headerData.volume = 50
      showVolume()
    })

    const mounted = Array.from(frag.children).map((el) => parent.appendChild(el))

    return function unmount() {
      mounted.forEach(el => el.remove())
    }
  }
}
