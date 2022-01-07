export const FileSelect = {
  /**
   * Mount file select.
   *
   * @param {HTMLInputElement} input
   * @param {Object} options
   * @param {function(File)} options.onSelect
   * @param {function(File)} options.onClear
   */
  mount(input, { onSelect = Promise.resolve, onClear = Promise.resolve }) {
    const parent = input.parentNode
    const emptyLabel = parent.querySelector('.empty')
    const fnameLabel = parent.querySelector('.fname')

    input.addEventListener('change', async () => {
      if (input.files.length) {
        const selectedFile = input.files[0]

        emptyLabel.setAttribute('hidden', '')
        fnameLabel.innerText = selectedFile.name
        fnameLabel.removeAttribute('hidden')

        await onSelect(selectedFile)
      }

      else {
        fnameLabel.setAttribute('hidden', '')
        fnameLabel.innerText = ''
        emptyLabel.removeAttribute('hidden')

        await onClear()
      }
    })

    input.removeAttribute('disabled')
  }
}
