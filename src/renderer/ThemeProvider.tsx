import React from 'react'

// Lightweight theme wrapper: avoid importing MUI theming here because
// some bundlers / dev setups can cause runtime interop issues where
// MUI's createTheme isn't resolved correctly (createTheme_default is not a function).
// For now we simply add a body class so our CSS dark theme applies.
export default function AppTheme({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    try { document.body.classList.add('body') } catch (e) {}
    return () => { try { document.body.classList.remove('body') } catch (e) {} }
  }, [])

  return <>{children}</>
}
