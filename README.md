# EO Phoenix Editor

Desktop application for configuring and managing the EO2 Photo Frame. Create settings files, prepare media, and sideload the [EO Phoenix Android app](https://github.com/kiwiKodo/EO_Phoenix) via Bluetooth.

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
- **Display Duration**: Set how long each photo displays (minimum 1 minute, no upper limit)
- **Shuffle**: Randomize media playback order
- **Loop Videos**: Repeat videos continuously during slideshow delay
- **Allow Full Length Videos**: Play videos to completion regardless of slideshow delay
- **Orientation**: Set portrait or landscape orientation

#### Schedule
- Set daily on/off times for the display
- Save energy by turning off during specific hours

#### Brightness Control
- Set manual brightness level (0-100%)
- Note: Auto-brightness is not currently available

#### Frames
- Choose from single, double, or triple mat frames, or no frame

#### Captions
- Enable photo captions
- Customize caption appearance

### 2. Prepare Media

#### Media Editor
1. Click the **Media** tab
2. Set frame orientation (portrait or landscape)
3. Select photos, add borders and captions
4. Choose border style (single, double, triple, none)
5. Add custom text overlays
6. Save edited photos

#### Organize Media
- Place photos and videos in a media folder
- Assign the media folder to play in the slideshow
- Video must be manually added to the Media Folder. Supported formats:
  - Videos: MP4, AVI, MKV

### 3. Generate Settings File

1. Complete all settings tabs
2. Click **Save Settings** in the System tab
3. The app creates `settings.json` with your configuration

### 4. Copy to SD Card

Save the `settings.json` file and media folders to the SD card in the `/SD card/EoPhoenix/` directory. Ensure the media folder names match the folder name specified in your slideshow settings.

### 5. Install on Frame

1. Download the [EO Phoenix Android app](https://github.com/kiwiKodo/EO_Phoenix/releases/latest)
2. Install the APK on the EO2 Photo Frame
3. Connect the SD card
4. The app will automatically load settings and start

## SD Card Structure

After export, your SD card should have this structure:
```
SD card/
└── EoPhoenix/
    ├── settings.json
    ├── Summer Vacation/         # Media folder example
    │   ├── photo1.jpg
    │   ├── photo2.png
    │   └── video1.mp4
    └── Family Photos/           # Another media folder example
        ├── photo3.jpg
        └── photo4.png
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
- Verify `settings.json` is in `/SD card/EoPhoenix/`
- Check that the file is valid JSON (no syntax errors)
- Review logs on the frame at `/SD card/EoPhoenix/eo-logs.txt`

### Media files not displaying
- Confirm files are in `/SD card/EoPhoenix/Media Folder/`
- Check that files are in supported formats (JPG, PNG, MP4)
- Ensure SD card is properly inserted in the frame

## Related Projects

- **[EO Phoenix Android App](https://github.com/kiwiKodo/EO_Phoenix)** - Android app that runs on the EO2 Photo Frame

## License

This project is provided as-is for use with EO2 Photo Frame devices.

## Support

For issues, questions, or contributions, please visit the [Issues](https://github.com/kiwiKodo/EO_Phoenix-Editor/issues) page.
