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
 * @param {ptiTools.HeaderParseResult} options.headerData
 * @param {Float32Array} options.audio
 * @param {AudioContext} audioCtx
 * @returns {DocumentFragment}
 */
function render(document, player, headerData) {
  const { samplePlayback } = headerData

  const frag = getTemplate(document).cloneNode(true)
  const keypad = frag.querySelector('.keypad')
  const buttonTemplate = keypad.querySelector('button')
  buttonTemplate.remove()  // disconnect from fragment

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

  if (isSliced(samplePlayback)) {
    Array.from(headerData.slices).forEach((_, idx) => {
      const sliceButton = buttonTemplate.cloneNode(true)
      sliceButton.setAttribute('title', `Slice ${idx + 1}`)
      sliceButton.addEventListener('click', () => player.playSlice(idx))
      keypad.appendChild(sliceButton)
    })
  }

  else if (isOneShot(samplePlayback) || isLoop(samplePlayback)) {
    // Firefox cannot actually handle the tuning range :-(
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1624681
    for (let o = 12; o > -25; o -= 12) {
      for (let n = 0; n < 12; n++) {
        const button = buttonTemplate.cloneNode(true)
        button.setAttribute('title', `${o + n} (hold)`)

        button.addEventListener('keydown', (evt) => {
          if (evt.which === 32 /* space */ && !evt.repeat) {
            player.playInstrument({ detune: (o + n) * 100 })
          }
        })
        button.addEventListener('keyup', () => player.stop())
        button.addEventListener('touchstart', () => player.playInstrument({ detune: (o + n) * 100 }))
        button.addEventListener('touchend', () => player.stop())
        button.addEventListener('mousedown', () => player.playInstrument({ detune: (o + n) * 100 }))
        button.addEventListener('mouseup', () => player.stop())
        button.addEventListener('mouseleave', () => player.stop())
        keypad.appendChild(button)
      }
    }
  }

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
