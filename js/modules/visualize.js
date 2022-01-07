/**
 * Draw instrument waveform, markers, loop region, slices etc.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {Float32Array} buffer
 * @param {Object} markers
 * @param {number} markers.start
 * @param {number} markers.end
 * @param {Object} region
 * @param {number} region.start
 * @param {number} region.end
 * @param {Array[Number]} slices
 */
export function drawInstrument(canvas, buffer, markers, region, slices) {
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
    drawRegion(ctx, region.start * width, region.end * width, height)
  }

  drawWaveform(ctx, buffer, width, height)

  if (markers) {
    drawMarkers(ctx, markers.start * width, markers.end * width, height)
  }

  if (slices) {
    drawSlices(ctx, slices, width, height)
  }
}

/**
 * Draw loop region and loop start/end markers.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} regionStart
 * @param {number} regionEnd
 * @param {number} height
 */
function drawRegion(ctx, regionStart, regionEnd, height) {
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
 * Draw the sample waveform.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Float32Array} buffer
 * @param {Number} width
 * @param {Number} height
 */
function drawWaveform(ctx, buffer, width, height) {
  const yScale = -height / 2
  const bufferLength = buffer.length

  ctx.translate(0, -yScale)
  ctx.strokeStyle = 'white'
  ctx.lineWidth = 1

  ctx.beginPath()
  let x, y, prevY
  let skipped = false
  const samplesToDraw = Math.min(width * 100, bufferLength)
  for (let i = 0; i <= samplesToDraw; i++) {
    if (i === 0) {
      ctx.moveTo(0, prevY = (buffer[0] * yScale).toFixed(3))
    } else {
      y = (buffer[Math.floor(i / samplesToDraw * bufferLength)] * yScale).toFixed(3)
      if (y !== prevY) {
        x = i / samplesToDraw * width
        if (skipped) ctx.lineTo(x, prevY)
        ctx.lineTo(x, prevY = y)
        skipped = false
      } else {
        skipped = true
      }
    }
  }
  ctx.stroke()

  ctx.resetTransform()
}

/**
 * Draw playback start/end markers.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} start
 * @param {number} end
 * @param {number} height
 */
function drawMarkers(ctx, start, end, height) {
  ctx.strokeStyle = 'white'
  ctx.lineWidth = 2

  ctx.beginPath()
    ;[start, end].forEach((marker, idx) => {
      ctx.moveTo(marker, height)
      ctx.lineTo(marker, 0)  // line
      // right/left pointing triangle (at the top)
      ctx.lineTo(marker + (idx ? -3 : 3), 3)
      ctx.lineTo(marker, 6)
    })
  ctx.stroke()
}

/**
 * Draw slice markers.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array[Number]} slices
 * @param {number} width
 * @param {number} height
 */
function drawSlices(ctx, slices, width, height) {
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
