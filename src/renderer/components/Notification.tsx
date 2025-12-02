import React from 'react'

// Show a temporary toast notification. This creates a container on document.body
// and appends a toast node which is removed after `duration` ms.
export function showNotification(message: string | React.ReactNode, duration = 3000, kind: 'default'|'success'|'error' = 'default') {
  try {
    const containerClass = 'toastContainer'
    let container = document.querySelector('.' + containerClass) as HTMLElement | null
    if (!container) {
      container = document.createElement('div')
      container.className = containerClass
      document.body.appendChild(container)
    }

    const node = document.createElement('div')
    node.className = 'toast' + (kind === 'default' ? '' : ' ' + kind)

    if (typeof message === 'string') node.textContent = message
    else {
      // if message is a React node, render it into the toast
      // create a temporary mount point
      const mount = document.createElement('div')
      node.appendChild(mount)
      // lazy-render using ReactDOM if available
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const ReactDOM = require('react-dom')
        ReactDOM.render(message as any, mount)
      } catch (e) {
        // fallback: stringify
        mount.textContent = String(message)
      }
    }

    container.appendChild(node)
    // auto-remove after duration
    const to = window.setTimeout(() => {
      try { node.remove() } catch (e) {}
      try { if (container && container.childElementCount === 0) container.remove() } catch (e) {}
    }, duration)

    return () => { window.clearTimeout(to); try { node.remove() } catch (e) {} }
  } catch (e) {
    // ignore
    return () => {}
  }
}

export default showNotification
