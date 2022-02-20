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
  }
}
