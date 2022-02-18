/**
 * Use <script type="module" /> to load.
 *
 * Browser will execute this script immediatly after the document has
 * been parsed, before firing DOMContentLoaded.
 *
 * In fact, DOMContentLoaded only fire until this script has loaded
 * and finished evaluating.
 *
 * Keep the bootstrap quick!
 */

/* FileSelect is necessary to bootstrap the application. */
// TODO: Inline this import using some build tool (someday)
import { FileSelect } from './components/FileSelect.js'

/**
 * Register teardown functions.
 *
 * These functions are executed each time a new file is selected
 * by the user, for example to:
 *
 * - Stop audio
 * - Reset UI
 * - Stop timers
 *
 * @instance
 */
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
    teardown() {
      let unmount
      while (unmount = mounted.shift()) {
        unmount()
      }
    }
  }
})()

const fileInput = document.getElementById('pti-file-input')

/**
 * Handle file selection (bootstrap).
 *
 * When a user selects a file, more of the application is loaded.
 */
 FileSelect.mount(fileInput, {
  async onSelect(file) {
    mounted.teardown()
    await fileSelected(file)
  }
})

/**
 * getAudioContext controls this value.
 */
let _audioCtx;

/**
 * Get or create an AudioContext.
 *
 * Please note: A `running` AudioContext can only be created "inside"
 * a user-initiated event.
 *
 * For example: a button `click`, or input `change` event.
 *
 * @returns {AudioContext}
 */
function getAudioContext() {
  return _audioCtx = _audioCtx ?? new (AudioContext || webkitAudioContext)({
    latencyHint: 'interactive',
    sampleRate: 44100,
  })
}

/**
 * Display an error message when a invalid file is selected.
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
/* DOM mount points, used by renderInstrument
 */
const dataSection = document.getElementById('pti-instrument-data')
const toolbar = document.getElementById('toolbar')
const previewSection = document.getElementById('pti-instrument-preview')
const displaySection = document.getElementById('pti-instrument-display')
const editorSection = document.getElementById('pti-instrument-editor')

/**
 * Display .pti file data when a valid file is selected.
 *
 * @param {import('./modules/ptiTools.js').HeaderParseResult} headerData
 * @param {ArrayBuffer} audio
 * @param {AudioContext} audioCtx
 */
async function renderInstrument(headerData, audio, audioCtx) {
  const ptiTools = await import('./modules/ptiTools.js')

  const { Toolbar } = await import('./components/Toolbar.js')
  const { InstrumentPreview } = await import('./components/InstrumentPreview.js')
  const { InstrumentDisplay } = await import('./components/InstrumentDisplay.js')
  //const { InstrumentDataTable } = await import('./components/InstrumentDataTable.js')
  const { InstrumentEditor } = await import('./components/InstrumentEditor.js')

  const { revoke, watch, data } = ptiTools.reactive(headerData)

  mounted.push(revoke)

  mounted.push(Toolbar.mount(toolbar, {
    headerData: data,
    audio,
    fileInput,
    dataSection,
    editorSection
  }))

  mounted.push(InstrumentDisplay.mount(displaySection, {
    headerData: data,
    audio,
    audioCtx
  }))

  mounted.push(await InstrumentPreview.mount(previewSection, {
    header: { watch, data },
    audio,
    audioCtx
  }))

  // mounted.push(InstrumentDataTable.mount(dataSection, {
  //   headerData: data,
  //   audio
  // }))

  mounted.push(InstrumentEditor.mount(editorSection, {
    header: { watch, data },
    audio
  }))
}

/**
 * File selection handler:
 *
 * - Load the ptiTools module
 *
 * - Is it a .pti file?
 *   - Validate header
 *   - Parse header (lazy)
 *   - Convert audio data for Web Audio
 *   - Kickstart application
 *
 * - Can the browser decode audio data?
 *   - Get the default .pti header
 *   - Set instrument name
 *   - Sum audio to mono
 *   - Set instrument sample length
 *   - Kickstart application
 *
 * - Not a valid .pti file?
 *   - Show header validation message
 *
 * - Browser throws an error decoding audio data?
 *   - Show error name, message and code
 *
 * @param {File} file
 */
async function fileSelected(file) {
  const ptiTools = await import('./modules/ptiTools.js')

  // This is a user-initiated event handler, use this opportunity
  // to get a AudioContext in the correct state.
  const audioCtx = getAudioContext()

  let headerData, audio

  /* It's a .pti file */
  if (file.name.endsWith('.pti')) {
    const header = await ptiTools.getHeader(file)

    const { valid: validHeader, message: headerValidationMessage } = ptiTools.validateHeader(header)

    /* No :( */
    if (!validHeader) {
      renderError('This file does not appear to be a valid .pti file!')
      headerValidationMessage && renderError(
        `(<small>${headerValidationMessage}</small>)</p>`,
        { userDangerousHTML: true }
      )
    }

    /* Yes! */
    else {
      headerData = ptiTools.parseHeader(header)
      audio = ptiTools.convert(await ptiTools.getAudio(file))
    }
  }

  /* Some audio file? */
  else {
    let audioBuffer

    try {
      audioBuffer = await audioCtx.decodeAudioData(await file.arrayBuffer())
    }

    /* No :( */
    catch (err) {
      renderError('Please select a .pti or audio file file.')
      renderError(
        `<small>${err.name}: ${err.message} (code: ${err.code})</small>`,
        { userDangerousHTML: true }
      )
    }

    /* Yes! */
    if (audioBuffer !== undefined) {
      headerData = ptiTools.getDefeaultHeader()

      // Strip common extensions from the file name to get the instrument name.
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

      // Sum multi-channel audio files (e.g. stereo) to mono
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
    await renderInstrument(headerData, audio, audioCtx)
  }
}
