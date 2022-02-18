import constants from '../modules/constants.js'
import * as ptiTools from '../modules/ptiTools.js'

const {
  SAMPLE_PLAYBACK_LABELS,
  FILTER_TYPE_LABELS,
  GRANULAR_LOOP_MODE_LABELS,
  GRANULAR_SHAPE_LABELS
} = constants
const {
  convertSend, convertVolume,
  displaydB, displayMilliseconds,
  isOneShot, isLoop, isSliced, isWavetable, isGranular,
  relOffset
} = ptiTools

const templateCache = new WeakMap()

/**
 * @param {Node} parent
 * @returns {HTMLTableElement}
 */
function getTemplate({ ownerDocument }) {
  if (!templateCache.has(ownerDocument)) {
    templateCache.set(
      ownerDocument,
      ownerDocument.getElementById(
        'template:instrument-data-table'
      ).content
    )
  }
  return templateCache.get(ownerDocument)
}

/**
 * Render the instrument data table.
 *
 * @param {HTMLElement} parent
 * @param {Object} options
 * @param {ptiTools.HeaderParseResult} options.headerData
 * @param {ArrayBuffer} audio
 * @returns {HTMLTableElement}
 */
function render(parent, { headerData, audio }) {
  const frag = getTemplate(parent).cloneNode(true)
  const table = frag.querySelector('table')
  const rowTemplate = table.querySelector('tr')
  rowTemplate.remove()  // Detach this template from the cloned table

  const createElement = parent.ownerDocument.createElement.bind(parent.ownerDocument)

  const createRow = (label, value) => {
    const row = rowTemplate.cloneNode(true)
    row.querySelector('th').innerText = label
    row.querySelector('td').innerText = value
    return row
  }

  const addRow = (label, value) => table.tBodies[0].appendChild(createRow(label, value))

  const sampleLengthInMs = audio.length / 44.1
  const headerLengthInMs = headerData.sampleLength / 44.1
  const displayOffset = (offset) => displayMilliseconds(relOffset(offset) * sampleLengthInMs)

  const samplePlayback = headerData.samplePlayback

  addRow('Name', headerData.name)
  addRow('Length',
    displayMilliseconds(sampleLengthInMs) +
    (headerLengthInMs != sampleLengthInMs ?
      ` (header says: ${displayMilliseconds(headerLengthInMs)})` : '')
  )
  addRow('Playback', SAMPLE_PLAYBACK_LABELS[samplePlayback])

  if (isOneShot(samplePlayback) || isLoop(samplePlayback)) {
    addRow('Start', displayOffset(headerData.playbackStart))

    if (isLoop(samplePlayback)) {
      addRow('Loop start', displayOffset(headerData.loopStart))
      addRow('Loop end', displayOffset(headerData.loopEnd))
    }

    addRow('End', displayOffset(headerData.playbackEnd))
  }

  else if (isSliced(samplePlayback)) {
    const slicesRow = createRow('Slices', '')
    const slicesCell = slicesRow.querySelector('td')
    const slicesDetails = createElement('details')
    const slicesSummary = slicesDetails.appendChild(createElement('summary'))
    slicesSummary.innerText = headerData.numSlices
    const slicesList = slicesDetails.appendChild(createElement('ol'))
    headerData.slices.forEach(offset => {
      const sliceLi = slicesList.appendChild(createElement('li'))
      sliceLi.innerText = displayOffset(offset)
    })
    slicesDetails.appendChild(slicesList)
    slicesCell.appendChild(slicesDetails)
    table.tBodies[0].appendChild(slicesRow)
  }

  else if (headerData.isWavetable && isWavetable(samplePlayback)) {
    addRow('Window size', headerData.wavetableWindowSize)
    addRow('Total positions', headerData.wavetableTotalPositions)
    addRow('Position', headerData.wavetablePosition)
  }

  else if (isGranular(samplePlayback)) {
    addRow('Length', displayMilliseconds(headerData.granularLength / 44.1))
    addRow('Position', displayOffset(headerData.granularPosition))
    addRow('Shape', GRANULAR_SHAPE_LABELS[headerData.granularShape])
    addRow('Loop mode', GRANULAR_LOOP_MODE_LABELS[headerData.granularLoopMode])
  }

  addRow('Volume', displaydB(convertVolume(headerData.volume)))
  addRow('Panning', headerData.panning - 50)
  addRow('Tune', headerData.tune)
  addRow('Finetune', headerData.finetune)

  if (!headerData.filterEnabled) {
    addRow('Filter', 'Disabled')
  } else {
    addRow('Filter', FILTER_TYPE_LABELS[headerData.filterType])
    addRow('Cutoff', Math.floor(headerData.cutoff * 100))
    addRow('Resonance', (headerData.resonance / 4.300000190734863 * 100).toFixed(0))
  }

  addRow('Overdrive', headerData.overdrive)
  addRow('Bit depth', headerData.bitDepth)

  addRow('Reverb send', displaydB(convertSend(headerData.reverbSend)))
  addRow('Delay send', displaydB(convertSend(headerData.delaySend)))

  return frag
}

export const InstrumentDataTable = {
  /**
   * Mount the instrument data table.
   *
   * @param {HTMLElement} parent
   * @param {Object} options
   * @param {ptiTools.HeaderParseResult} options.headerData
   * @param {ArrayBuffer} audio
   * @returns
   */
  mount(parent, { headerData, audio }) {
    let mounted = Array.from(render(parent, { headerData, audio }).children).map(
      (el) => parent.appendChild(el)
    )

    // Create an observer instance linked to the callback function
    const observer = new MutationObserver((mutations) => {
      if (parent.getAttribute('hidden') === null) {
        mounted.forEach(el => el.remove())
        mounted = Array.from(
          render(parent, { headerData, audio }).children
        ).map(
          (el) => parent.appendChild(el)
        )
      }
    })
    observer.observe(parent, { attributeFilter: ['hidden'] })

    return function unmount() {
      mounted.forEach(el => el.remove())
      observer.disconnect()
    }
  }
}
