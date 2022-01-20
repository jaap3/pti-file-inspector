import { FileSelect } from './components/FileSelect.js'

const dataSection = document.getElementById('pti-file-data')
const previewSection = document.getElementById('pti-file-preview')

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
 * @param {import('./modules/ptiTools.js').HeaderParseResult} headerData
 * @param {ArrayBuffer} audio
 */
async function renderInstrument(headerData, audio) {
  const { InstrumentPreview } = await import('./components/InstrumentPreview.js')
  const { InstrumentDataTable } = await import('./components/InstrumentDataTable.js')

  mounted.push(await InstrumentPreview.mount(previewSection, {
    headerData,
    audio,
    audioCtx: getAudioContext(),
    canvasWidth: dataSection.offsetWidth
  }))
  mounted.push(InstrumentDataTable.mount(dataSection, {
    headerData,
    audio
  }))
}

/*
 * File selection handler
 * @param {File} file
 */
async function fileSelected(file) {
  const ptiTools = await import('./modules/ptiTools.js')

  let headerData, audio

  if (file.name.endsWith('.pti')) {
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
      headerData = ptiTools.parseHeader(new ArrayBuffer(392))
      audio = audioBuffer.getChannelData(0)
    }
  }

  if (headerData !== undefined && audio !== undefined) {
    renderInstrument(headerData, audio)
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
