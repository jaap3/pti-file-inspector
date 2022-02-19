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

  frag.querySelector('button.play').addEventListener('click', (evt) => {
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

  const rowTemplate = frag.querySelector('.keypad-row')
  const buttonTemplate = rowTemplate.querySelector('button')
  buttonTemplate.remove()  // disconnect from fragment

  const isSliced = ptiTools.isSliced(samplePlayback)

  for (let octave = 1; octave >= -2; octave--) {
    const keypad = rowTemplate.cloneNode()

    for (let note = 0; note < 12; note++) {
      const idx = Math.abs(octave - 1) * 12 + note
      const detune = octave * 12 + note
      const button = buttonTemplate.cloneNode(true)

      const handlers = {
        stop() {
          player.stop()
        },
        play() {
          isSliced ?
            player.playSlice(idx) :
            // Firefox cannot actually handle the tuning range :-(
            // https://bugzilla.mozilla.org/show_bug.cgi?id=1624681
            player.playInstrument({ detune: detune * 100 })
        }
      }

      if (isSliced) {
        button.setAttribute('title', `Slice ${idx + 1}`)
        if (idx >= headerData.numSlices) { button.setAttribute('disabled', '') }
      } else {
        button.setAttribute('title', `${detune} (hold)`)

        // Think about using aria-role grid
        // https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/grid_role
        // button.tabIndex = detune === 0 ? 0 : -1
      }

      button.addEventListener('keydown', (evt) => {
        if (evt.which === 32 /* space */ && !evt.repeat) {
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

    rowTemplate.parentNode.insertBefore(keypad, rowTemplate)
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
   * @param {ptiTools.eHeaderParseResult} options.header.data
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
