import * as ptiTools from '../modules/ptiTools.js'

const templateCache = new WeakMap()

/**
 *
 * @param {Node} parent
 * @returns {DocumentFragment}
 */
function getTemplate({ ownerDocument }) {
  if (!templateCache.has(ownerDocument)) {
    templateCache.set(ownerDocument, ownerDocument.getElementById('template:toolbar').content)
  }
  return templateCache.get(ownerDocument)
}

/**
 *
 * @param {Document} document
 * @param {ArrayBuffer} file
 * @param {string} name
 */
function downloadFile(document, file, name) {
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.setAttribute('download', name)
  a.setAttribute('href', url)
  a.setAttribute('hidden', '')
  document.documentElement.appendChild(a)
  a.click()
  URL.revokeObjectURL(url)
}

export const Toolbar = {
  /**
   * Mount the toolbar.
   *
   * @param {HTMLElement} parent
   * @param {Object} options
   * @param {ptiTools.HeaderParseResult} options.headerData
   * @param {ArrayBuffer} options.audio
   * @param {HTMLElement} options.fileInput
   * @param {HTMLElement} options.dataSection
   * @param {HTMLElement} options.editorSection
   * @returns
   */
  mount(parent, { headerData, audio, fileInput, dataSection, editorSection }) {
    const { ownerDocument: document } = parent
    const frag = getTemplate(parent).cloneNode(true)

    frag.querySelector('button.load').addEventListener('click', (evt) => {
      const button = evt.currentTarget
      const labels = button.querySelectorAll('span')
      if (fileInput.getAttribute('hidden') === '') {
        button.setAttribute('aria-pressed', 'true')
        labels[0].setAttribute('hidden', '')
        labels[1].removeAttribute('hidden')
        fileInput.removeAttribute('hidden')
        // Wait for the browser to reflow
        setTimeout(() => {
          fileInput.scrollIntoView()
          fileInput.focus()
        }, 0)
      } else {
        button.setAttribute('aria-pressed', 'false')
        labels[0].removeAttribute('hidden')
        labels[1].setAttribute('hidden', '')
        fileInput.setAttribute('hidden', '')
      }
    })

    frag.querySelector('button.export-pti').addEventListener('click', () => {
      downloadFile(
        document,
        ptiTools.getPtiFile(audio, headerData),
        `${headerData.name}.pti`
      )
    })

    frag.querySelector('button.export-wav').addEventListener('click', () => {
      downloadFile(
        document,
        ptiTools.getWavFile(audio, headerData),
        `${headerData.name}.wav`
      )
    })
    const mounted = Array.from(frag.children).map((el) => parent.appendChild(el))

    fileInput.setAttribute('hidden', '')
    parent.removeAttribute('hidden')

    return function unmount() {
      fileInput.removeAttribute('hidden')
      dataSection.removeAttribute('hidden')
      editorSection.setAttribute('hidden', '')
      mounted.forEach(el => el.remove())
    }
  }
}
