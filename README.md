# EO Phoenix Editor

Desktop application for configuring and managing the EO2 Photo Frame. Create settings files, prepare media, and sideload the Android app via Bluetooth.

## Features

- 🖼️ **Media Editor** - Add borders and captions to photos
- ⚙️ **Settings Configuration** - WiFi, slideshow, schedule, brightness, and caption settings
- 📁 **File Management** - Browse and organize media folders
- 📱 **Bluetooth Sideloading** - Install the Android app directly to the frame
- 💾 **Export Package** - Generate complete SD card package with settings and media

## Download

Download the latest installer from [Releases](https://github.com/kiwiKodo/EO_Phoenix-Editor/releases/latest)

- **Windows**: `eo-phoenix-editor Setup 0.1.0.exe`

## Installation

1. Download the installer for your platform
2. Run the installer
3. Launch EO Phoenix Editor

## Usage

### 1. Configure Settings

#### WiFi Setup
- Enter your WiFi SSID (2.4 GHz networks only)
- Enter your WiFi password
- Note: The EO2 frame only supports 2.4 GHz networks

#### Slideshow Settings
- **Display Duration**: Set how long each photo displays (5-60 seconds)
- **Transition Style**: Choose fade, slide, or zoom transitions
- **Video Settings**: Configure video playback options

#### Schedule
- Set daily on/off times for the display
- Configure brightness levels for different times
- Save energy by turning off during specific hours

#### Brightness Control
- Set manual brightness level (0-100%)
- Note: Auto-brightness is not currently available

#### Captions
- Enable photo date/time captions
- Choose font, size, and position
- Customize caption appearance

### 2. Prepare Media

#### Media Editor
1. Click the **Media** tab
2. Select photos to add borders and captions
3. Choose border style (single, double, triple)
4. Add custom text overlays
5. Save edited photos

#### Organize Media
- Place photos in a `photos` folder
- Place videos in a `videos` folder
- Supported formats:
  - Images: JPG, PNG
  - Videos: MP4, AVI, MKV

### 3. Generate Settings File

1. Complete all settings tabs
2. Click **Save Settings** in the System tab
3. The app creates `eo-settings.json` with your configuration

### 4. Export to SD Card

**Option A: Direct Export**
1. Insert SD card into your computer
2. Click **Export** in the File menu
3. Select the SD card drive
4. The app copies:
   - `eo-settings.json`
   - `photos/` folder
   - `videos/` folder
   - To `/SD card/EoPhoenix/`

**Option B: Sideload via Bluetooth**
1. Ensure Bluetooth is enabled on your computer
2. Use the **Sideload App** feature in the EO2 Setup tab
3. Follow on-screen instructions to pair with the frame
4. Transfer the Android APK directly

### 5. Install on Frame

1. Download the [EO Phoenix Android app](https://github.com/kiwiKodo/EO_Phoenix/releases/latest)
2. Copy the APK to the SD card or sideload via Bluetooth
3. Insert SD card into the EO2 Photo Frame
4. Install the APK (if not already installed)
5. The app will automatically load settings and start

## SD Card Structure

After export, your SD card should have this structure:
```
SD card/
└── EoPhoenix/
    ├── eo-settings.json
    ├── photos/
    │   ├── photo1.jpg
    │   ├── photo2.png
    │   └── ...
    └── videos/
        ├── video1.mp4
        └── ...
```

## Development

### Prerequisites
- Node.js 18 or higher
- npm 9 or higher

### Setup
```bash
# Clone the repository
git clone https://github.com/kiwiKodo/EO_Phoenix-Editor.git
cd EO_Phoenix-Editor

# Install dependencies
npm install

# Run in development mode
npm run dev:electron
```

### Build
```bash
# Build the app
npm run build

# Package installer
npm run package
```

The installer will be generated in the `dist/` folder.

### Project Structure
```
src/
├── main/
│   ├── main.ts           # Electron main process
│   └── preload.ts        # Preload script (IPC bridge)
├── renderer/
│   ├── App.tsx           # Main React app
│   ├── components/
│   │   ├── MediaEditor.tsx      # Media editing interface
│   │   ├── SettingsEditor.tsx   # Settings configuration
│   │   ├── ConfirmModal.tsx     # Confirmation dialogs
│   │   └── Notification.tsx     # Toast notifications
│   ├── assets/          # Images, fonts, borders
│   └── styles.css       # Global styles
└── scripts/
    └── make-icon.js     # Icon generation script
```

### Technologies
- **Electron 26** - Desktop framework
- **React 18** - UI framework
- **TypeScript 5** - Type safety
- **Vite 5** - Build tool
- **Material-UI 5** - Component library

## Troubleshooting

### Can't connect to frame via Bluetooth
- Ensure Bluetooth is enabled on your computer
- Make sure the frame is powered on and in pairing mode
- Try restarting the Bluetooth service

### Settings not loading on frame
- Verify `eo-settings.json` is in `/SD card/EoPhoenix/`
- Check that the file is valid JSON (no syntax errors)
- Review logs on the frame at `/SD card/EoPhoenix/eo-logs.txt`

### Media files not displaying
- Confirm files are in `/SD card/EoPhoenix/photos/` or `/videos/`
- Check that files are in supported formats (JPG, PNG, MP4)
- Ensure SD card is properly inserted in the frame

## Related Projects

- **[EO Phoenix Android App](https://github.com/kiwiKodo/EO_Phoenix)** - Android app that runs on the EO2 Photo Frame

## License

This project is provided as-is for use with EO2 Photo Frame devices.

## Support

For issues, questions, or contributions, please visit the [Issues](https://github.com/kiwiKodo/EO_Phoenix-Editor/issues) page.
