import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import AppTheme from './ThemeProvider'

const container = document.getElementById('root')!
const root = createRoot(container)
root.render(
	<AppTheme>
		<App />
	</AppTheme>
)
