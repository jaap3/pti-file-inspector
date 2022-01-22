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
   * @param {Float32Array} options.audio
   * @param {AudioContext} audioCtx
   * @param {number} canvasWidth
   * @returns
   */
  async mount(parent, { headerData, audio, audioCtx, canvasWidth }) {
    const samplePlayback = headerData.samplePlayback

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

    const frag = parent.ownerDocument.adoptNode(
      getTemplate(parent).cloneNode(true)
    )
    const canvas = frag.querySelector('canvas.waveform')
    const audioEl = frag.querySelector('audio')
    const keypad = frag.querySelector('.keypad')
    const buttonTemplate = keypad.querySelector('button')
    buttonTemplate.remove()  // disconnect from fragment
    canvas.width = canvasWidth

    requestAnimationFrame(() => drawInstrument(canvas, audio, markers, region, slices))

    const player = await ptiPlayer.load(audioEl, audioCtx, audio, headerData)

    frag.querySelector('button.start').addEventListener('click', () => player.playSample())
    frag.querySelector('button.stop').addEventListener('click', () => player.stop())

    frag.querySelector('button.export-pti').addEventListener('click', () => {
      const file = ptiTools.getPtiFile(audio, headerData)
      const url = URL.createObjectURL(file)
      const a = parent.ownerDocument.createElement('a')
      a.setAttribute('download', `${headerData.name.replaceAll('\x00', '')}.pti`)
      a.setAttribute('href', url)
      a.setAttribute('hidden', '')
      parent.appendChild(a)
      a.click()
      URL.revokeObjectURL(url)
    })

    frag.querySelector('button.export-wav').addEventListener('click', () => {
      const file = ptiTools.getWavFile(audio)
      const url = URL.createObjectURL(file)
      const a = parent.ownerDocument.createElement('a')
      a.setAttribute('download', `${headerData.name.replaceAll('\x00', '')}.wav`)
      a.setAttribute('href', url)
      a.setAttribute('hidden', '')
      parent.appendChild(a)
      a.click()
      URL.revokeObjectURL(url)
    })

    if (slices) {
      slices.forEach((_, idx) => {
        const sliceButton = buttonTemplate.cloneNode(true)
        sliceButton.setAttribute('title', `Slice ${idx + 1}`)
        sliceButton.addEventListener('click', () => player.playSlice(idx))
        keypad.appendChild(sliceButton)
      })
    }

    if (isOneShot(samplePlayback) || isLoop(samplePlayback)) {
      for (let i = 0; i <= 12; i++) {
        const button = buttonTemplate.cloneNode(true)
        button.setAttribute('title', `Play instrument (hold)`)

        button.addEventListener('keydown', (evt) => {
          if (evt.which === 32 /* space */ && !evt.repeat) {
            player.playInstrument({ detune: i * 100 })
          }
        })
        button.addEventListener('keyup', () => player.stop())
        button.addEventListener('touchstart', () => player.playInstrument({ detune: i * 100 }))
        button.addEventListener('touchend', () => player.stop())
        button.addEventListener('mousedown', () => player.playInstrument({ detune: i * 100 }))
        button.addEventListener('mouseup', () => player.stop())
        button.addEventListener('mouseleave', () => player.stop())
        keypad.appendChild(button)
      }
    }

    const mounted = Array.from(frag.children).map((el) => parent.appendChild(el))

    return function unmount() {
      player.stop()
      mounted.forEach(el => el.remove())
    }
  },

}
