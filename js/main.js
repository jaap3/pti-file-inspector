import { FileSelect } from './components/FileSelect.js'

const dataSection = document.getElementById('pti-file-data')
const previewSection = document.getElementById('pti-file-preview')
const mounted = []

let audioCtx;

function getAudioContext() {
  return audioCtx = audioCtx ?? new (AudioContext || webkitAudioContext)({
    latencyHint: 'playback',
    sampleRate: 44100,
  })
}

/**
 * Display .pti file data.
 *
 * @param {File} file
 * @returns
 */
async function fileSelected(file) {
  const ptiTools = await import('./modules/ptiTools.js')

  const header = await ptiTools.getHeader(file)

  const { valid: validHeader, message: headerValidationMessage } = ptiTools.validateHeader(header)

  if (!validHeader) {
    dataSection.innerHTML = `<p>
        This file does not appear to be a valid .pti file!
        ${headerValidationMessage ? ` (<small>${headerValidationMessage}</small>)` : ''}
    </p>`

    return
  }

  const headerData = ptiTools.parseHeader(header)
  const audio = await ptiTools.getAudio(file)

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

/**
 * Remove mounted elements
 */
async function teardown() {
  let unmount
  while (unmount = mounted.shift()) {
    unmount()
  }
}

/**
 * Handle file selection
 */
FileSelect.mount(document.getElementById('pti-file-input'), {
  async onSelect(file) {
    await teardown()
    await fileSelected(file)
  },
  onClear: teardown
})
