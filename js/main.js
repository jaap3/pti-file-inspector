import { FileSelect } from './components/FileSelect.js'

const dataSection = document.getElementById('pti-instrument-data')
const toolbar = document.getElementById('toolbar')
const previewSection = document.getElementById('pti-instrument-preview')
const displaySection = document.getElementById('pti-instrument-display')
const editorSection = document.getElementById('pti-instrument-editor')

const mounted = (() => {
  /** @type Array<Function> */
  const mounted = []

  return {
    /**
     * Add mounted elements
     *
     * @param {Function} teardown Function that removes the mounted element(s)
     */
    push(teardown) {
      mounted.push(teardown)
    },

    /**
    * Remove mounted elements
    */
    async teardown() {
      let unmount
      while (unmount = mounted.shift()) {
        unmount()
      }
    }
  }
})()

let audioCtx;

/**
 * Get or create an AudioContext
 * @returns {AudioContext}
 */
function getAudioContext() {
  return audioCtx = audioCtx ?? new (AudioContext || webkitAudioContext)({
    latencyHint: 'interactive',
    sampleRate: 44100,
  })
}

/**
 * Display an error message
 *
 * @param {string} message Error message as string
 * @param {object} options
 * @param {bool} options.userDangerousHTML Use innerHTML to set the message (DANGER: never include user input!)
 */
function renderError(message, { userDangerousHTML = false } = {}) {
  const p = document.createElement('p')
  p.className = 'error'
  p[userDangerousHTML ? 'innerHTML' : 'innerText'] = message
  dataSection.appendChild(p)
  mounted.push(() => p.remove())
}

/**
 * Display .pti file data.
 *
 * @param {import('./modules/ptiTools.js').ReactiveHeaderParseResult} headerData
 * @param {ArrayBuffer} audio
 */
async function renderInstrument(headerData, audio) {
  const { Toolbar } = await import('./components/Toolbar.js')
  const { InstrumentPreview } = await import('./components/InstrumentPreview.js')
  const { InstrumentDisplay } = await import('./components/InstrumentDisplay.js')
  const { InstrumentDataTable } = await import('./components/InstrumentDataTable.js')
  const { InstrumentEditor } = await import('./components/InstrumentEditor.js')

  mounted.push(headerData.revoke)

  mounted.push(Toolbar.mount(toolbar, {
    headerData: headerData.data,
    audio,
    dataSection,
    editorSection
  }))

  mounted.push(await InstrumentDisplay.mount(displaySection, {
    headerData: headerData.data,
    audio,
    audioCtx: getAudioContext(),
    canvasWidth: displaySection.offsetWidth
  }))

  mounted.push(await InstrumentPreview.mount(previewSection, {
    headerData: headerData.data,
    audio,
    audioCtx: getAudioContext(),
  }))

  mounted.push(InstrumentDataTable.mount(dataSection, {
    headerData: headerData.data,
    audio
  }))

  mounted.push(InstrumentEditor.mount(editorSection, {
    headerData,
    audio
  }))
}

/**
 * File selection handler
 * @param {File} file
 */
async function fileSelected(file) {
  const ptiTools = await import('./modules/ptiTools.js')

  let headerData, audio

  if (file.name.endsWith('.pti')) {
    // It's a .pti file
    const header = await ptiTools.getHeader(file)

    const { valid: validHeader, message: headerValidationMessage } = ptiTools.validateHeader(header)

    if (!validHeader) {
      renderError('This file does not appear to be a valid .pti file!')
      headerValidationMessage && renderError(
        `(<small>${headerValidationMessage}</small>)</p>`,
        { userDangerousHTML: true }
      )
    }

    else {
      headerData = ptiTools.parseHeader(header)
      audio = ptiTools.convert(await ptiTools.getAudio(file))
    }
  }

  else {
    // Some audio file
    const audioCtx = getAudioContext()

    let audioBuffer

    try {
      audioBuffer = await audioCtx.decodeAudioData(await file.arrayBuffer())
    } catch (err) {
      renderError('Please select a .pti or audio file file.')
      renderError(
        `<small>${err.name}: ${err.message} (code: ${err.code})</small>`,
        { userDangerousHTML: true }
      )
    }

    if (audioBuffer !== undefined) {
      headerData = ptiTools.getDefeaultHeader()

      const ext = file.name.split('.').at(-1)
      let fname

      switch (ext) {
        case 'wav':
        case 'mp3':
        case 'mp4':
        case 'm4a':
        case 'ogg':
        case 'aac':
          fname = file.name.slice(0, -4)
          break
        case 'flac':
        case 'webm':
          fname = file.name.slice(0, -5)
          break
        default:
          fname = file.name
      }

      headerData.name = fname.substring(0, 31)
      audio = audioBuffer.getChannelData(0)

      const nChannels = audioBuffer.numberOfChannels
      if (nChannels > 1) {
        // Audio file isn't mono, sum all channels

        // The audio var already contains channel one, sum the data from the other channels
        const channels = Array.from(Array(nChannels - 1), (_, i) => audioBuffer.getChannelData(i + 1))
        audio.forEach((v, i) => audio[i] = channels.reduce((sum, channel) => sum += channel[i] / nChannels, v / nChannels))
      }

      headerData.sampleLength = audio.length
    }
  }

  if (headerData !== undefined && audio !== undefined) {
    renderInstrument(ptiTools.reactive(headerData), audio)
  }
}

/**
 * Handle file selection (bootstrap)
 */
FileSelect.mount(document.getElementById('pti-file-input'), {
  async onSelect(file) {
    await mounted.teardown()
    await fileSelected(file)
  },
  onClear: mounted.teardown
})
