Signing Windows installers (EXE) with a PFX certificate
======================================================

This project can sign the generated Windows installer during the release workflow using a PFX certificate. The release workflow will decode a Base64-encoded PFX stored in a repository secret and pass it to electron-builder via environment variables so the produced EXE is code-signed.

Overview of steps
1. Obtain a code-signing certificate (PFX) from a Certificate Authority (recommended: EV code signing cert for best SmartScreen reputation).
2. Export the cert+private key as a .pfx file.
3. Base64-encode the .pfx and store it in the `SIGNING_PFX_BASE64` secret on GitHub; store the PFX password in the `SIGNING_PASSWORD` secret.
4. Push a release tag — the release workflow will sign the EXE automatically if the secrets are present.

PowerShell: base64-encode a .pfx and set the GitHub secret (using `gh`)
-----------------------------------------------------------------
Open PowerShell on Windows and run the following commands (replace paths and names):

```powershell
# Base64-encode the PFX file (no line breaks)
$pfxPath = 'C:\path\to\your\codesign.pfx'
$b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($pfxPath))
$b64 | Out-File -FilePath .\pfx.base64 -Encoding ascii

# Use gh to set the secret (requires gh auth login beforehand)
gh secret set SIGNING_PFX_BASE64 --body "$(Get-Content -Raw .\pfx.base64)"
gh secret set SIGNING_PASSWORD --body "YourPfxPasswordHere"
```

Notes and tips
- Keep the PFX secret and the password private. Use repository-level or organization-level secrets (prefer repo-level for immediate use).
- The workflow decodes `SIGNING_PFX_BASE64` and writes the PFX to a temporary file on the runner, then sets `CSC_LINK` and `CSC_KEY_PASSWORD` so `electron-builder` can sign the installer.
- If you prefer manual signing, you can run electron-builder locally and set environment variables:

```powershell
# Locally (PowerShell)
$env:CSC_LINK = 'C:\path\to\codesign.pfx'
$env:CSC_KEY_PASSWORD = 'YourPfxPassword'
npm run package
```

Troubleshooting
- Windows signing requires `signtool.exe` (part of Windows SDK). On GitHub Actions `windows-latest` runner, electron-builder will use the available signtool.
- If signing fails in CI, inspect the Actions logs for `signtool` errors. Common issues: invalid password, PFX missing private key, or certificate chain issues.
- For broad distribution, use an EV code signing cert to reduce SmartScreen prompts.

If you want, I can prepare a draft release (CI will still need the secrets to sign). Otherwise, trigger the workflow by pushing a tag and the release will be created and signed automatically when secrets are present.
