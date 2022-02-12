export const FileSelect = {
  /**
   * Mount file select.
   *
   * @param {HTMLInputElement} input
   * @param {Object} options
   * @param {function(File)} options.onSelect
   * @param {function(File)} options.onClear
   */
  mount(input, { onSelect }) {
    const parent = input.parentNode.parentNode

    input.addEventListener('change', async () => {
      if (input.files.length) {
        const selectedFile = input.files[0]
        await onSelect(selectedFile)
      }
    })

    input.removeAttribute('disabled')

    // Create an observer instance linked to the callback function
    const observer = new MutationObserver((mutations) => {
      if (input.getAttribute('hidden') === '') {
        parent.setAttribute('hidden', '')
      } else {
        parent.removeAttribute('hidden')
      }
    })
    observer.observe(input, { attributeFilter: ['hidden'] })

    return function unmount() {
      observer.disconnect()
    }
  }
}
