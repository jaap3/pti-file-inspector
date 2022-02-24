import * as ptiTools from '../modules/ptiTools.js'
import * as ptiPlayer from '../modules/ptiPlayer.js'

const templateCache = new WeakMap()

const { isOneShot, isLoop, isSliced } = ptiTools

/**
 *
 * @param {Document} document
 * @returns {DocumentFragment}
 */
function getTemplate(document) {
  if (!templateCache.has(document)) {
    templateCache.set(document, document.getElementById('template:instrument-preview').content)
  }
  return templateCache.get(document)
}

/**
 *
 * @param {Document} document
 * @param {ptiPlayer.PtiPlayer} player
 * @param {ptiTools.HeaderParseResult} headerData
 * @returns {DocumentFragment}
 */
function render(document, player, headerData) {
  const { samplePlayback } = headerData

  const frag = getTemplate(document).cloneNode(true)

  /** @type {Element} */
  const rowTemplate = frag.querySelector('.keypad-row')
  const buttonTemplate = rowTemplate.querySelector('button')
  buttonTemplate.remove()  // disconnect from fragment

  const isSliced = ptiTools.isSliced(samplePlayback)

  if (isSliced) {
    /** @type {Element} */
    const container = frag.querySelector('.keypad-container')
    container.classList.add('sliced')
  }

  for (let octave = 1; octave >= -2; octave--) {
    /** @type {Element} */
    const keypad = rowTemplate.cloneNode()

    for (let note = 0; note < 12; note++) {
      const idx = Math.abs(octave - 1) * 12 + note
      const detune = octave * 12 + note
      /** @type {HTMLButtonElement} */
      const button = buttonTemplate.cloneNode(true)

      let play
      if (isSliced) {
        play = () => {
          headerData.activeSlice = idx
          player.playSlice(idx)
        }
      } else {
        play = () => {
          // Firefox cannot actually handle the tuning range :-(
          // https://bugzilla.mozilla.org/show_bug.cgi?id=1624681
          player.playInstrument({ detune: detune * 100 })
        }
      }

      const handlers = {
        stop() {
          player.stop()
        },
        play
      }

      if (isSliced) {
        button.setAttribute('title', `Slice ${idx + 1}`)
        if (idx >= headerData.numSlices) { button.setAttribute('disabled', '') }

        if (idx === 0) {
          button.setAttribute('data-home', 'true')
        }
      } else {
        button.setAttribute('title', `${detune} (hold)`)

        // Think about using aria-role grid
        // https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/grid_role
        // button.tabIndex = detune === 0 ? 0 : -1

        if (detune === 0) {
          button.setAttribute('data-home', 'true')
        }
      }

      button.addEventListener('keydown', (evt) => {
        if (evt.code === 'Space' && !evt.repeat) {
          handlers.play()
        }
      })
      button.addEventListener('keyup', handlers.stop)
      button.addEventListener('touchstart', handlers.play)
      button.addEventListener('touchend', handlers.stop)
      button.addEventListener('mousedown', handlers.play)
      button.addEventListener('mouseup', handlers.stop)
      button.addEventListener('mouseleave', handlers.stop)
      keypad.appendChild(button)
    }

    rowTemplate.before(keypad)
  }

  rowTemplate.remove()  // disconnect from template

  return frag
}

export const InstrumentPreview = {
  /**
   *
   * @param {HTMLElement} parent
   * @param {Object} options
   * @param {Object} options.header
   * @param {ptiTools.HeaderParseResult} options.header.data
   * @param {function} options.header.watch
   * @param {Float32Array} options.audio
   * @param {AudioContext} audioCtx
   * @returns {Promise<Function>} unmount
   */
  async mount(parent, { header, audio, audioCtx }) {
    const player = await ptiPlayer.load(parent, audioCtx, audio, header.data)

    const rendered = render(parent.ownerDocument, player, header.data)

    const mounted = Array.from(rendered.children).map((el) => parent.appendChild(el))
    parent.removeAttribute('hidden')

    setTimeout(() => {
      parent.querySelector('[data-home]').parentNode.scrollIntoView()
    }, 0)

    header.watch({
      afterUpdate(prop) {
        if (prop === 'samplePlayback' || prop === 'slices') {
          player.stop()
          let el
          while (el = mounted.pop()) {
            el.remove()
          }
          const rendered = render(parent.ownerDocument, player, header.data)
          Array.from(rendered.children).forEach((el) => mounted.push(parent.appendChild(el)))

          setTimeout(() => {
            parent.querySelector('[data-home]').parentNode.scrollIntoView()
          }, 0)
        }
      }
    })

    return function unmount() {
      player.stop()
      let el
      while (el = mounted.pop()) {
        el.remove()
      }
    }
  },

}
