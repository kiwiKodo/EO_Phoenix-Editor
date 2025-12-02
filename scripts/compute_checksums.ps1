# Compute SHA256 checksums for release artifacts under dist/
param(
  [string]$OutFile = "checksums.txt"
)

if (Test-Path $OutFile) { Remove-Item $OutFile }

Get-ChildItem -Path dist -Recurse -Include *.exe,*.apk -ErrorAction SilentlyContinue | ForEach-Object {
  $h = Get-FileHash -Algorithm SHA256 $_.FullName
  "$($h.Hash)  $($_.FullName)" | Out-File -FilePath $OutFile -Append -Encoding utf8
}

if (Test-Path $OutFile) { Get-Content $OutFile }
