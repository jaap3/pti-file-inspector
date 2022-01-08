import * as ptiTools from '../modules/ptiTools.js'
import * as ptiPlayer from '../modules/ptiPlayer.js'
import { drawInstrument } from '../modules/visualize.js'

const templateCache = new WeakMap()

const { isOneShot, isLoop, isSliced, relOffset } = ptiTools

/**
 *
 * @param {Node} parent
 * @returns {DocumentFragment}
 */
function getTemplate({ ownerDocument }) {
  if (!templateCache.has(ownerDocument)) {
    templateCache.set(ownerDocument, ownerDocument.getElementById('template:instrument-preview').content)
  }
  return templateCache.get(ownerDocument)
}

export const InstrumentPreview = {
  /**
   *
   * @param {HTMLElement} parent
   * @param {Object} options
   * @param {ptiTools.HeaderParseResult} options.headerData
   * @param {ArrayBuffer} options.audio
   * @param {AudioContext} audioCtx
   * @param {number} canvasWidth
   * @returns
   */
  async mount(parent, { headerData, audio, audioCtx, canvasWidth }) {
    const samplePlayback = headerData.samplePlayback

    const buffer = ptiTools.convert(audio)

    const markers = (isOneShot(samplePlayback) || isLoop(samplePlayback)) ? {
      start: ptiTools.relOffset(headerData.playbackStart),
      end: ptiTools.relOffset(headerData.playbackEnd)
    } : null

    const region = isLoop(samplePlayback) ? {
      start: ptiTools.relOffset(headerData.loopStart),
      end: ptiTools.relOffset(headerData.loopEnd),
    } : null

    const slices = (isSliced(samplePlayback) ?
      Array.from(headerData.slices).map(relOffset)
      : null
    )

    const frag = getTemplate(parent).cloneNode(true)
    const canvas = frag.querySelector('canvas.waveform')
    const keypad = frag.querySelector('.keypad')
    const buttonTemplate = keypad.querySelector('button')
    buttonTemplate.remove()  // disconnect from fragment
    canvas.width = canvasWidth

    requestAnimationFrame(() => drawInstrument(canvas, buffer, markers, region, slices))

    const player = await ptiPlayer.load(audioCtx, buffer, headerData)

    frag.querySelector('button.start').addEventListener('click', () => player.playSample())
    frag.querySelector('button.stop').addEventListener('click', () => player.stop())

    if (slices) {
      slices.forEach((_, idx) => {
        const sliceButton = buttonTemplate.cloneNode(true)
        sliceButton.setAttribute('title', `Slice ${idx + 1}`)
        sliceButton.addEventListener('click', () => player.playSlice(idx))
        keypad.appendChild(sliceButton)
      })
    }

    if (isOneShot(samplePlayback) || isLoop(samplePlayback)) {
      const button = buttonTemplate.cloneNode(true)
      button.setAttribute('title', `Play instrument (hold)`)

      button.addEventListener('keydown', (evt) => {
        if (evt.which === 32 /* space */ && !evt.repeat) {
          player.playInstrument()
        }
      })
      button.addEventListener('keyup', () => player.stop())
      button.addEventListener('touchstart', () => player.playInstrument())
      button.addEventListener('touchend', () => player.stop())
      button.addEventListener('mousedown', () => player.playInstrument())
      button.addEventListener('mouseup', () => player.stop())
      button.addEventListener('mouseleave', () => player.stop())
      button.addEventListener('blur', () => player.stop())
      keypad.appendChild(button)
    }

    const mounted = Array.from(frag.children).map((el) => parent.appendChild(el))

    return function unmount() {
      player.stop()
      mounted.forEach(el => el.remove())
    }
  },

}
