(() => {
  const $ = (sel, el = document) => el.querySelector(sel)

  const ROW_TEMPLATE = $('#data-row').content

  const BUTTON_TEMPLATE = document.createElement('button')
  BUTTON_TEMPLATE.setAttribute('type', 'button')
  BUTTON_TEMPLATE.className = 'keypad'

  const ptiFileInput = $('#pti-file-input')
  ptiFileInput.addEventListener('change', fileSelected)
  ptiFileInput.removeAttribute('disabled')

  const ptiFileInputLabel = ptiFileInput.parentNode
  const emptyLabel = $('.empty', ptiFileInputLabel)
  const fnameLabel = $('.fname', ptiFileInputLabel)

  const ptiFileDataSection = $('.pti-file-data')

  async function fileSelected() {
    if (ptiFileInput.files.length) {
      const selectedFile = ptiFileInput.files[0]
      emptyLabel.setAttribute('hidden', '')
      fnameLabel.innerText = selectedFile.name
      fnameLabel.removeAttribute('hidden')
      await displayPtiFileDataSection(selectedFile)
    } else {
      fnameLabel.setAttribute('hidden', '')
      fnameLabel.innerText = ''
      emptyLabel.removeAttribute('hidden')
      clearPtiFileDataSection()
    }
  }

  let audioCtxSource = null

  const KNOWN_MAGIC = {
    0: 84, // 'T'
    1: 73, // 'I'
    2: 1,
    3: 0,
    4: 1,
    5: [4, 5],
    6: [0, 1],
    7: 1,
    8: 9,
    9: 9,
    10: 9,
    11: 9,
    12: 116,
    13: 1,
    14: [102, 110],
    15: 102,
    16: 1,
    17: 0,
    18: 0,
    19: 0
  }

  const SAMPLE_PLAYBACK = {
    0: '1-Shot',
    1: 'Forward loop',
    2: 'Backward loop',
    3: 'PingPong loop',
    4: 'Slice',
    5: 'Beat slice',
    6: 'Wavetable',
    7: 'Granular',
  }

  const GRANULAR_SHAPE = {
    0: 'Square',
    1: 'Triangle',
    2: 'Gauss'
  }

  const GRANULAR_LOOP_MODE = {
    0: 'Forward',
    1: 'Backward',
    2: 'PingPong'
  }

  const FILTER_TYPE = {
    0: 'Low-pass',
    1: 'High-pass',
    2: 'Band-pass'
  }

  function validateHeader(header) {
    if (header.byteLength !== 392) {
      return [false, 'Wrong size']
    }

    const magic = new Uint8Array(header.slice(0, 20))

    for (let i = 0; i < 20; i++) {
      if (!(KNOWN_MAGIC[i].includes?.(magic[i]) ?? KNOWN_MAGIC[i] == magic[i])) {
        return [false, `Bad magic ${i}`]
      }
    }

    return [true, null]
  }

  async function displayPtiFileDataSection(file) {
    clearPtiFileDataSection()

    // Read the header
    const header = await file.slice(0, 392).arrayBuffer()

    const [validHeader, headerValidationMessage] = validateHeader(header)
    if (!validHeader) {
      ptiFileDataSection.innerHTML = `<p>
            This file does not appear to be a valid .pti file!
            ${headerValidationMessage ? ` (<small>${headerValidationMessage}</small>)` : ''}
        </p>`
      return
    } else {
      // Create a table to show all the PTI file data
      const ptiDataTable = document.createElement('table')
      const addRow = (label, value) => ptiDataTable.appendChild(_createRow(label, value))

      const samplePlayback = SAMPLE_PLAYBACK[
        new Uint8Array(header.slice(76, 77))[0]
      ]

      const sampleLengthInMs = new Int32Array(
        header.slice(60, 64)
      )[0] / 44.1

      const relOffset = (offset) => offset / 65535
      const absOffset = (offset) => offset * sampleLengthInMs
      const convertOffset = (offset) => absOffset(relOffset(offset))

      const isOneShot = samplePlayback == '1-Shot'
      const isLoop = ['Forward loop', 'Backward loop', 'PingPong loop'].includes(samplePlayback)
      const isSliced = ['Slice', 'Beat slice'].includes(samplePlayback)

      let markers
      let region

      let numSlices = 0
      let slices = []

      if (isSliced) {
        numSlices = new Uint8Array(header.slice(376, 377))[0]
        slices = Array.from(
          new Uint16Array(header.slice(280, 376)).slice(0, numSlices)
        ).map(relOffset)
      }

      const playbackStart = new Uint16Array(header.slice(78, 80))[0]
      const playBackEnd = new Uint16Array(header.slice(84, 86))[0]
      let loopStart, loopEnd;

      if (isOneShot || isLoop) {
        markers = {
          start: relOffset(playbackStart),
          end: relOffset(playBackEnd)
        }
      }

      if (isLoop) {
        loopStart = new Uint16Array(header.slice(80, 82))[0] - 1
        loopEnd = new Uint16Array(header.slice(82, 84))[0] + 1
        region = {
          start: relOffset(loopStart),
          end: relOffset(loopEnd),
        }
      }

      const [sampleRow, startPlayback, stopPlayback] = await getSampleDataRow(
        file,
        markers,
        region,
        slices,
      )
      ptiFileDataSection.appendChild(sampleRow)

      addRow('Name', new TextDecoder('ascii').decode(
        new Uint8Array(header.slice(21, 52))
      ))

      addRow('Length', _displayMs(sampleLengthInMs))

      const isWavetable = (
        new Uint8Array(header.slice(20, 21))[0] === 1 && samplePlayback === 'Wavetable'
      )

      addRow('Playback', samplePlayback)

      const displayOffset = (offset) => _displayMs(convertOffset(offset))

      if (isOneShot || isLoop) {
        addRow('Start', displayOffset(playbackStart))

        if (isLoop) {
          // Web Audio API seems to only allow forwards loops.
          // TODO: Figure out how to support backwards and pingpong loops
          //       Would reversing the loop region audio data work?
          //       I.e. append a reversed section to the audio (after the
          //       loop endpoint) and fudge the loop start / end points
          //       so only the reversed part plays (or forwards/backwards in
          //       case of pingpong loops)
          addRow('Loop start', displayOffset(loopStart))
          addRow('Loop end', displayOffset(loopEnd))
        }

        addRow('End', displayOffset(playBackEnd))

        const auditionRow = ROW_TEMPLATE.cloneNode(true)
        $('th', auditionRow).innerText = 'Audition'
        const auditionCell = $('td', auditionRow)
        const auditionButton = BUTTON_TEMPLATE.cloneNode(true)
        auditionButton.setAttribute('title', `Audition instrument (hold)`)
        const auditonSample = () => startPlayback(
          playbackStart, playBackEnd - playbackStart, {
          'loop': isLoop,
          'loopStart': convertOffset(loopStart) / 1000,
          'loopEnd': convertOffset(loopEnd) / 1000
        })
        auditionButton.addEventListener('keydown', (evt) => {
          if (evt.which === 32 /* space */ && !evt.repeat) {
            auditonSample()
          }
        })
        auditionButton.addEventListener('keyup', () => stopPlayback())
        auditionButton.addEventListener('touchstart', () => auditonSample())
        auditionButton.addEventListener('touchend', () => stopPlayback())
        auditionButton.addEventListener('mousedown', () => auditonSample())
        auditionButton.addEventListener('mouseup', () => stopPlayback())
        auditionButton.addEventListener('mouseleave', () => stopPlayback())
        auditionButton.addEventListener('blur', () => stopPlayback())
        auditionCell.appendChild(auditionButton)
        ptiDataTable.appendChild(auditionRow)
      }

      else if (isSliced) {
        const slicesRow = ROW_TEMPLATE.cloneNode(true)
        $('th', slicesRow).innerText = 'Slices'

        const slicesCell = $('td', slicesRow)
        slices.map(absOffset).forEach((sliceStart, idx) => {
          const sliceButton = BUTTON_TEMPLATE.cloneNode(true)
          const sliceEnd = absOffset(slices[idx + 1])
          sliceButton.setAttribute('title', `Slice ${idx + 1}`)
          sliceButton.addEventListener('click', () => startPlayback(
            sliceStart, sliceEnd ? sliceEnd - sliceStart : 0)
          )
          slicesCell.appendChild(sliceButton)
        })
        ptiDataTable.appendChild(slicesRow)
      }

      else if (isWavetable) {
        addRow('Window size', new Uint16Array(header.slice(64, 66))[0])
        addRow('Total positions', new Uint16Array(header.slice(68, 70))[0])
        addRow('Position', new Uint16Array(header.slice(88, 90))[0])

      }

      else if (samplePlayback === 'Granular') {
        addRow('Length', _displayMs(new Uint16Array(header.slice(378, 380))[0] / 44.1))
        addRow('Position', displayOffset(new Uint16Array(header.slice(380, 382))[0]))
        addRow('Shape', GRANULAR_SHAPE[new Uint8Array(header.slice(382, 383))[0]])
        addRow('Loop mode', GRANULAR_LOOP_MODE[new Uint8Array(header.slice(383, 384))[0]])
      }

      const converVolume = (value) => {
        return Math.round(((value * 12 / 25) - 24) * 100) / 100
      }

      addRow('Volume', `${converVolume(new Uint8Array(header.slice(272, 273))[0])} dB`)
      addRow('Panning', new Uint8Array(header.slice(276, 277))[0] - 50)
      addRow('Tune', new Int8Array(header.slice(270, 271))[0])
      addRow('Finetune', new Int8Array(header.slice(271, 272))[0])

      const filterType = new Uint8Array(header.slice(268, 270))
      if (filterType[1] === 0) {
        addRow('Filter', 'Disabled')
      } else if (filterType[1] === 1) {
        addRow('Filter', FILTER_TYPE[filterType[0]])
        addRow('Cutoff', Math.round(new Float32Array(header.slice(260, 264))[0] * 100))
        addRow('Resonance', Math.round(new Float32Array(header.slice(264, 268))[0] / 4.3 * 100))
      }

      const convertSend = (value) => {
        const level = Math.round((-40 + value * 2 / 5) * 100) / 100
        if (level === -40) return -Infinity
        return level
      }

      addRow('Overdrive', new Uint8Array(header.slice(385, 386))[0])
      addRow('Bit depth', new Uint8Array(header.slice(386, 387))[0])
      addRow('Reverb send', `${convertSend(new Uint8Array(header.slice(384, 385))[0])} dB`)
      addRow('Delay send', `${convertSend(new Uint8Array(header.slice(278, 279))[0])} dB`)

      // Show the table
      ptiFileDataSection.appendChild(ptiDataTable)
    }
  }

  function _displayMs(ms) {
    return ms < 800 ?
      `${Math.round(ms * 10) / 10} ms` :
      `${Math.round(ms) / 1000} s`
  }

  function _createRow(label, value) {
    const row = ROW_TEMPLATE.cloneNode(true)
    $('th', row).innerText = label
    $('td', row).innerText = value
    return row
  }

  async function getSampleDataRow(file, markers, region, slices) {
    const row = $('#audio-preview-row').content.cloneNode(true)

    // Create audio context, used later to preview audio
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)({
      latencyHint: 'playback',
      sampleRate: 44100,
    })

    // Create a buffer and allocate all the bytes
    const ptiAudioBuffer = new Int16Array(await file.slice(392).arrayBuffer())
    const audioCtxBuffer = audioCtx.createBuffer(1, ptiAudioBuffer.byteLength, 44100)
    const bufferLength = ptiAudioBuffer.length

    // Copy pti audio to 1st audio context buffer channel (mono audio)
    // Piggy back on this loop to draw the waveform
    // Create a canvas to draw a waveform on
    const canvas = $('canvas.waveform', row)
    const canvasCtx = canvas.getContext('2d')
    canvas.width = $('.container').offsetWidth - 50
    const xScale = canvas.width
    const yScale = canvas.height / 2

    canvasCtx.fillStyle = '#0A0A0A'
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height)

    if (region) {
      const regionStart = region.start * canvas.width
      const regionEnd = region.end * canvas.width
      canvasCtx.fillStyle = '#323232'
      canvasCtx.fillRect(regionStart, 0, regionEnd - regionStart, canvas.height)
      canvasCtx.strokeStyle = 'white'
      canvasCtx.lineWidth = 2
      canvasCtx.beginPath()
      canvasCtx.moveTo(regionStart, 0)
      canvasCtx.lineTo(regionStart, canvas.height)
      canvasCtx.lineTo(regionStart + 3, canvas.height - 3)
      canvasCtx.lineTo(regionStart, canvas.height - 6)
      canvasCtx.moveTo(regionEnd, 0)
      canvasCtx.lineTo(regionEnd, canvas.height)
      canvasCtx.lineTo(regionEnd - 3, canvas.height - 3)
      canvasCtx.lineTo(regionEnd, canvas.height - 6)
      canvasCtx.stroke()
    }

    if (markers) {
      const markStart = markers.start * canvas.width
      const markEnd = markers.end * canvas.width
      canvasCtx.strokeStyle = 'white'
      canvasCtx.lineWidth = 2
      canvasCtx.beginPath()
      canvasCtx.moveTo(markStart, canvas.height)
      canvasCtx.lineTo(markStart, 0)
      canvasCtx.lineTo(markStart + 3, 3)
      canvasCtx.lineTo(markStart, 6)
      canvasCtx.moveTo(markEnd, canvas.height)
      canvasCtx.lineTo(markEnd, 0)
      canvasCtx.lineTo(markEnd - 3, 3)
      canvasCtx.lineTo(markEnd, 6)
      canvasCtx.stroke()
    }

    canvasCtx.translate(0, yScale)

    canvasCtx.beginPath()
    canvasCtx.strokeStyle = 'white'
    canvasCtx.lineWidth = 1

    const audioCtxBufferChannel = audioCtxBuffer.getChannelData(0)
    for (let i = 0; i < bufferLength; i++) {
      audioCtxBufferChannel[i] = ptiAudioBuffer[i] / 32767
      if (i === 0) {
        canvasCtx.moveTo(0, -audioCtxBufferChannel[i] * yScale)
      } else {
        canvasCtx.lineTo(i / bufferLength * xScale, -audioCtxBufferChannel[i] * yScale)
      }
    }
    canvasCtx.stroke()

    canvasCtx.beginPath()
    slices.forEach((slice) => {
      canvasCtx.strokeStyle = '#65491f'
      canvasCtx.moveTo(slice * xScale, -yScale + 3)
      canvasCtx.lineTo(slice * xScale - 3, -yScale)
      canvasCtx.lineTo(slice * xScale + 3, -yScale)
      canvasCtx.lineTo(slice * xScale, -yScale + 3)
      canvasCtx.lineTo(slice * xScale, yScale)
    })
    canvasCtx.stroke()

    const startPlayback = (offset = 0, duration, options = {}) => {
      audioCtxSource?.stop(0)
      audioCtxSource = new AudioBufferSourceNode(audioCtx, {
        ...options,
        buffer: audioCtxBuffer
      })
      audioCtxSource.connect(audioCtx.destination)
      audioCtxSource.start(0, offset / 1000, duration ? duration / 1000 : undefined)
    }

    const stopPlayback = () => audioCtxSource?.stop(0)

    $('button.start', row).addEventListener('click', () => startPlayback())
    $('button.stop', row).addEventListener('click', () => stopPlayback())

    return [row, startPlayback, stopPlayback]
  }

  function clearPtiFileDataSection() {
    audioCtxSource?.stop(0)
    ptiFileDataSection.innerHTML = ''
  }
})()
