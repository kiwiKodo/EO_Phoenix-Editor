import React from 'react'
import MediaEditor from './components/MediaEditor'
import SettingsEditor from './components/SettingsEditor'

export default function App() {
  const [route, setRoute] = React.useState<'media'|'settings'>('media')
  // Get version from package.json (injected at build time)
  const version = '0.3.3'
  return (
    <div className="app">
      <header className="topbar">
        <h1>EO Phoenix Editor <span className="version">v{version}</span></h1>
        <nav>
          <button className={`topNavBtn ${route === 'media' ? 'active' : ''}`} onClick={() => setRoute('media')}>Media</button>
          <button className={`topNavBtn ${route === 'settings' ? 'active' : ''}`} onClick={() => setRoute('settings')}>Settings</button>
        </nav>
      </header>
      <main>
        {route === 'media' ? <MediaEditor /> : <SettingsEditor />}
      </main>
    </div>
  )
}
