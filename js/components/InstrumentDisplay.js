import { drawInstrument } from '../modules/visualize.js'

const templateCache = new WeakMap()

/**
 *
 * @param {Node} parent
 * @returns {DocumentFragment}
 */
function getTemplate({ ownerDocument }) {
  if (!templateCache.has(ownerDocument)) {
    templateCache.set(ownerDocument, ownerDocument.getElementById('template:instrument-display').content)
  }
  return templateCache.get(ownerDocument)
}

export const InstrumentDisplay = {
  /**
   *
   * @param {HTMLElement} parent
   * @param {Object} options
   * @param {import('../modules/ptiTools.js').HeaderParseResult} options.headerData
   * @param {Float32Array} options.audio
   * @param {AudioContext} webkitAudioContext
   * @returns {function} unmount
   */
  mount(parent, { headerData, audio, audioCtx }) {
    const frag = parent.ownerDocument.adoptNode(
      getTemplate(parent).cloneNode(true)
    )
    const canvas = frag.querySelector('canvas.waveform')
    canvas.width = parent.parentNode.offsetWidth

    const mounted = Array.from(frag.children).map((el) => parent.appendChild(el))

    const visualize = drawInstrument(canvas, headerData, audio)

    parent.removeAttribute('hidden')

    return function unmount() {
      visualize.stop()
      mounted.forEach(el => el.remove())
    }
  }
}
