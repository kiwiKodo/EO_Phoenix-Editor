Preparing GitHub Releases for the EO Phoenix Editor
===============================================

This project includes an automated GitHub Actions workflow to build the Windows installer and publish release assets (EXE and APK) when you push a tag like `v0.1.0`.

What the workflow does
- Runs on `push` of tags matching `v*`.
- Installs dependencies, runs `npm run build` and `npm run package` (electron-builder).
- Optionally installs a code signing certificate if you provide it as a repository secret (see below).
- Computes SHA256 checksums for any `*.exe` and `*.apk` files produced under `dist/` and writes `checksums.txt`.
- Creates a GitHub Release and uploads the artifacts and `checksums.txt`.

How to use it (manual steps)
1. Create a tag and push it. Example (PowerShell):

```powershell
git tag -a v0.1.0 -m "Release v0.1.0"
git push origin v0.1.0
```

2. The workflow will run on GitHub and, if successful, create a Release with the generated artifacts.

Providing code signing credentials (optional but recommended)
- Windows EXE signing: provide a PFX as a Base64 secret and the PFX password.
  - Create two repository secrets:
    - `SIGNING_PFX_BASE64` — Base64-encoded contents of your `.pfx` certificate file.
    - `SIGNING_PASSWORD` — password for the PFX.

  The workflow will detect `SIGNING_PFX_BASE64` and write the PFX to a temporary file, then set `CSC_LINK` and `CSC_KEY_PASSWORD` so `electron-builder` can sign the installer during packaging.

- Android APK signing (if you build APK in CI): store your keystore similarly and wire Gradle signing with secrets (not included by default). See Android/Gradle docs for configuring signing with environment variables.

If you don't provide signing credentials, the workflow will still produce an unsigned EXE and upload it — users can still download and run it, but unsigned executables may trigger SmartScreen warnings on Windows.

Manual upload (if you prefer)
- You can also create a Release locally and upload assets using the GitHub CLI (`gh`):

```powershell
gh release create "v0.1.0" --title "v0.1.0" --notes "EO Phoenix Editor release" --draft
gh release upload "v0.1.0" ".\dist\eo-phoenix-editor Setup 0.1.0.exe" ".\dist\EO2_Phoenix.apk" --clobber
gh release edit "v0.1.0" --publish
```

Verifying checksums
- After the release is published, copy the `checksums.txt` file and verify with `Get-FileHash` (PowerShell) or `sha256sum` (Linux/macOS).

Security notes
- Keep signing secrets private. Use GitHub repository secrets or organization secrets.
- For wide public distribution, consider code-signing with an EV certificate and publishing via an established store (Google Play) for the APK.
