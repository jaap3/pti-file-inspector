export function drawWaveform(canvas, buffer, markers, region, slices) {
  const ctx = canvas.getContext('2d', {
    alpha: false,
    desynchronized: true
  })
  const width = canvas.width
  const height = canvas.height

  // Draw background
  ctx.fillStyle = '#0A0A0A'
  ctx.fillRect(0, 0, width, height)

  if (region) {
    _drawRegion(ctx, region.start * width, region.end * width, height)
  }

  _drawWaveform(ctx, buffer, width, height)

  if (markers) {
    _drawMarkers(ctx, markers.start * width, markers.end * width, height)
  }

  if (slices) {
    _drawSlices(ctx, slices, width, height)
  }
}

/**
 * Draw loop region and loop start/end markers
 */
function _drawRegion(ctx, regionStart, regionEnd, height) {
  ctx.fillStyle = '#323232'
  ctx.strokeStyle = 'white'
  ctx.lineWidth = 2

  ctx.fillRect(regionStart, 0, regionEnd - regionStart, height)

  ctx.beginPath()
  ;[regionStart, regionEnd].forEach((marker, idx) => {
    ctx.moveTo(marker, 0)
    ctx.lineTo(marker, height)  // line
    // right/left pointing triangle (at the bottom)
    ctx.lineTo(marker + (idx ? -3 : 3), height - 3)
    ctx.lineTo(marker, height - 6)
  })
  ctx.stroke()
}

/**
 * Draw the sample waveform
 */
function _drawWaveform(ctx, buffer, width, height) {
  const yScale = -height / 2
  const bufferLength = buffer.length

  ctx.translate(0, -yScale)
  ctx.strokeStyle = 'white'
  ctx.lineWidth = 1

  ctx.beginPath()
  for (let i = 0; i < bufferLength; i++) {
    if (i === 0) {
      ctx.moveTo(0, buffer[i] * yScale)
    } else {
      ctx.lineTo(i / bufferLength * width, buffer[i] * yScale)
    }
  }
  ctx.stroke()

  ctx.resetTransform()
}

/**
 * Draw playback start/end markers
 */
function _drawMarkers(ctx, markStart, markEnd, height) {
  ctx.strokeStyle = 'white'
  ctx.lineWidth = 2

  ctx.beginPath()
  ;[markStart, markEnd].forEach((marker, idx) => {
    ctx.moveTo(marker, height)
    ctx.lineTo(marker, 0)  // line
    // right/left pointing triangle (at the top)
    ctx.lineTo(marker + (idx ? -3 : 3), 3)
    ctx.lineTo(marker, 6)
  })
  ctx.stroke()
}

/**
 * Draw slice markers
 */
function _drawSlices(ctx, slices, width, height) {
  ctx.strokeStyle = '#65491f'
  ctx.lineWidth = 1

  ctx.beginPath()
  slices.forEach((slice) => {
    ctx.moveTo(slice * width, 3)
    ctx.lineTo(slice * width - 3, 0)
    ctx.lineTo(slice * width + 3, 0)
    ctx.lineTo(slice * width, 3)
    ctx.lineTo(slice * width, height)
  })
  ctx.stroke()
}
