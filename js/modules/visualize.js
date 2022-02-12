import * as ptiTools from '../modules/ptiTools.js'

const { isOneShot, isLoop, isSliced, relOffset } = ptiTools

/**
 * Draw instrument waveform, markers, loop region, slices etc.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {ptiTools.HeaderParseResult} buffer
 * @param {Float32Array} buffer
 * @param {Array[Number]} slices
 */
export function drawInstrument(canvas, headerData, buffer) {
  const { ownerDocument: d } = canvas
  const { requestAnimationFrame } = d.defaultView

  const offscreenCanvas = d.createElement('canvas')

  const width = offscreenCanvas.width = canvas.width
  const height = offscreenCanvas.height = canvas.height

  const offscreenCtx = offscreenCanvas.getContext('2d', {
    alpha: false,
    desynchronized: true
  })

  const ctx = canvas.getContext('2d', {
    alpha: false,
    desynchronized: true
  })

  // Draw background
  drawWaveform(offscreenCtx, buffer, width, height)

  let timeout, raf;

  const render = () => {
    const markers = (isOneShot(headerData.samplePlayback) || isLoop(headerData.samplePlayback)) ? {
      start: ptiTools.relOffset(headerData.playbackStart),
      end: ptiTools.relOffset(headerData.playbackEnd)
    } : null

    const region = isLoop(headerData.samplePlayback) ? {
      start: ptiTools.relOffset(headerData.loopStart),
      end: ptiTools.relOffset(headerData.loopEnd),
    } : null

    const slices = (isSliced(headerData.samplePlayback) ?
      Array.from(headerData.slices).map(relOffset)
      : null
    )

    // Draw background
    ctx.drawImage(offscreenCanvas, 0, 0)

    if (region) {
      drawRegion(ctx, region.start * width, region.end * width, height)
    }

    if (markers) {
      drawMarkers(ctx, markers.start * width, markers.end * width, height)
    }

    if (slices) {
      drawSlices(ctx, slices, width, height)
    }

    timeout = setTimeout(() => raf = requestAnimationFrame(render), 1 / 25)
  }

  timeout = setTimeout(() => raf = requestAnimationFrame(render), 0)

  return {
    stop() {
      timeout && clearTimeout(timeout)
      raf && cancelAnimationFrame(raf)
    }
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
  ctx.save()

  ctx.globalCompositeOperation = 'lighter'
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

  ctx.restore()
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

  ctx.save()

  ctx.fillStyle = '#0A0A0A'
  ctx.fillRect(0, 0, width, height)

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
  ctx.restore()
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
  ctx.save()

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

  ctx.restore()
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
  ctx.save()

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

  ctx.restore()
}
