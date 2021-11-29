;(() => {
  const url = new URL(window.location)
  const info = url.searchParams.get('info')
  const error = url.searchParams.get('error')

  function addMessageBlock(message, className) {
    const div = document.createElement('div')
    div.id = 'toast'

    const icon = document.createElement('div')
    icon.id = 'toast-icon'
    icon.innerText = 'icon'
    div.appendChild(icon)

    const desc = document.createElement('div')
    desc.id = 'desc'
    desc.innerText = message
    div.appendChild(desc)

    document.body.appendChild(div)

    div.className = `show ${className}`

    setTimeout(() => {
      div.className = div.className.replace('show', '')
    }, 5000)
  }

  if (info) {
    addMessageBlock(info, 'bg-blue-500')
  }
  if (error) {
    addMessageBlock(error, 'bg-red-500')
  }
})()
