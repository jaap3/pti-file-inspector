import * as ptiTools from '../modules/ptiTools.js'

const { displaydB, convertVolume } = ptiTools

const templateCache = new WeakMap()

/**
 *
 * @param {Node} parent
 * @returns {DocumentFragment}
 */
function getTemplate({ ownerDocument }) {
  if (!templateCache.has(ownerDocument)) {
    templateCache.set(ownerDocument, ownerDocument.getElementById('template:instrument-editor').content)
  }
  return templateCache.get(ownerDocument)
}

export const InstrumentEditor = {
  /**
   * @param {HTMLElement} parent
   * @param {Object} options
   * @param {ptiTools.HeaderParseResult} options.headerData
   * @param {ArrayBuffer} audio
   * @returns
   */
  mount(parent, { headerData, audio }) {
    const frag = getTemplate(parent).cloneNode(true)

    const form = frag.querySelector('form')

    /* Name */
    form.name.value = headerData.name
    form.name.addEventListener('change', () => headerData.name = form.name.value)

    /* Volume */
    const showVolume = () => {
      form.volume.valueAsNumber = headerData.volume
      form['volume-result'].value = displaydB(convertVolume(headerData.volume))
    }
    showVolume()

    form.volume.addEventListener('wheel', (e) => {
      headerData.volume = Math.min(Math.max(0, headerData.volume - Math.sign(e.deltaY) * 1), 100)
      showVolume()
    })

    form.volume.addEventListener('change', () => {
      headerData.volume = form.volume.valueAsNumber
      showVolume()
    })

    form.volume.addEventListener('dblclick', () => {
      headerData.volume = 50
      showVolume()
    })

    /* Panning */
    const showPanning = () => {
      form.panning.valueAsNumber = headerData.panning
      const displayValue = headerData.panning - 50
      form['panning-result'].value = `${displayValue} (${displayValue < 0 ? 'left' : displayValue === 0 ? 'center' :  'right'})`
    }
    showPanning()

    form.panning.addEventListener('wheel', (e) => {
      headerData.panning = Math.min(Math.max(0, headerData.panning - Math.sign(e.deltaY) * 1), 100)
      showPanning()
    })

    form.panning.addEventListener('change', () => {
      headerData.panning = form.panning.valueAsNumber
      showPanning()
    })

    form.panning.addEventListener('dblclick', () => {
      headerData.panning = 50
      showPanning()
    })

    /* Tune */
    const showTune = () => {
      form['tune-result'].value = form.tune.valueAsNumber = headerData.tune
    }
    showTune()

    form.tune.addEventListener('wheel', (e) => {
      headerData.tune = Math.min(Math.max(-24, headerData.tune - Math.sign(e.deltaY) * 1), 24)
      showTune()
    })

    form.tune.addEventListener('change', () => {
      headerData.tune = form.tune.valueAsNumber
      showTune()
    })

    form.tune.addEventListener('dblclick', () => {
      headerData.tune = 0
      showTune()
    })

    /* Finetune */
    const showFinetune = () => {
      form['finetune-result'].value = form.finetune.valueAsNumber = headerData.finetune
    }
    showFinetune()

    form.finetune.addEventListener('wheel', (e) => {
      headerData.finetune = Math.min(Math.max(-100, headerData.finetune - Math.sign(e.deltaY) * 1), 100)
      showFinetune()
    })

    form.finetune.addEventListener('change', () => {
      headerData.finetune = form.finetune.valueAsNumber
      showFinetune()
    })

    form.finetune.addEventListener('dblclick', () => {
      headerData.finetune = 0
      showFinetune()
    })

    const mounted = Array.from(frag.children).map((el) => parent.appendChild(el))

    return function unmount() {
      mounted.forEach(el => el.remove())
    }
  }
}
