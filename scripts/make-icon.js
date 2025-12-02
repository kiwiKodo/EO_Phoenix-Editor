// scripts/make-icon.js
// Generate a multi-resolution ICO from src/renderer/assets/EO2Phoenix_logo.svg or .png
// Usage: node scripts/make-icon.js

const fs = require('fs')
const path = require('path')

async function main() {
  const root = path.resolve(__dirname, '..')
  const assetsDir = path.join(root, 'src', 'renderer', 'assets')
  const svgPath = path.join(assetsDir, 'EO2Phoenix_logo.svg')
  const pngPath = path.join(assetsDir, 'EO2Phoenix_logo.png')
  const outIco = path.join(assetsDir, 'Eo2Phoenix_logo.ico')

  // sizes we want embedded in the ICO
  const sizes = [256, 128, 64, 48, 32, 16]

  // Try to load required modules
  let sharp
  let pngToIco
  try {
    sharp = require('sharp')
    pngToIco = require('png-to-ico')
  } catch (e) {
    console.error('Missing dependency: please install devDependencies `sharp` and `png-to-ico` (npm install --save-dev sharp png-to-ico)')
    process.exit(2)
  }

  // Determine input source: prefer SVG if present
  let inputBuffer = null
  let inputIsSvg = false
  if (fs.existsSync(svgPath)) {
    inputBuffer = fs.readFileSync(svgPath)
    inputIsSvg = true
    console.log('Using SVG source:', svgPath)
  } else if (fs.existsSync(pngPath)) {
    inputBuffer = fs.readFileSync(pngPath)
    console.log('Using PNG source:', pngPath)
  } else {
    console.error('No source logo found. Add EO2Phoenix_logo.svg or EO2Phoenix_logo.png to src/renderer/assets')
    process.exit(3)
  }

  try {
    // Render PNGs at required sizes (large to small), collect buffers
    const pngBuffers = []
    for (const s of sizes) {
      let img = sharp(inputBuffer, inputIsSvg ? { density: 300 } : undefined)
      // Ensure square output: resize to s x s
      img = img.resize(s, s, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      const buf = await img.png().toBuffer()
      pngBuffers.push(buf)
    }

    // Use png-to-ico to combine
    const icoBuf = await pngToIco(pngBuffers)
    fs.writeFileSync(outIco, icoBuf)
    console.log('Wrote ICO to', outIco)
  } catch (err) {
    console.error('Failed to generate ICO:', err)
    process.exit(4)
  }
}

main()
