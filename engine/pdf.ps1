# Export a project page to PDF using the site's print layout.
#   powershell -File engine/pdf.ps1 <project-folder-name> ["Output name.pdf"]
# Builds the site with light figures (any name.print.png beside name.png), serves _site briefly, prints the page with headless Chrome,
# and writes the PDF into the project's folder.
param([Parameter(Mandatory)][string]$Slug, [string]$Name)

$root = Split-Path $PSScriptRoot -Parent
$chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
if (-not (Test-Path $chrome)) { throw "Chrome not found at $chrome" }
if (-not (Test-Path "$root\projects\$Slug\article.md")) { throw "No project named $Slug" }
if (-not $Name) { $Name = "$Slug.pdf" }
$out = "$root\projects\$Slug\$Name"

Push-Location $root
try {
  $env:SITE_PRINT = '1'; node engine/build.mjs | Out-Null; Remove-Item Env:SITE_PRINT   # light figure versions
  $port = 4011
  $srv = Start-Process python -ArgumentList '-m', 'http.server', $port, '--directory', '_site', '--bind', '127.0.0.1' -PassThru -WindowStyle Hidden
  Start-Sleep 2
  $profile = Join-Path $env:TEMP "site-pdf-profile"
  $tmp = Join-Path $env:TEMP "site-pdf-$Slug.pdf"; Remove-Item $tmp -ErrorAction SilentlyContinue
  $a = @('--headless=new', '--disable-gpu', '--no-first-run', '--no-pdf-header-footer', '--virtual-time-budget=6000',
    "--user-data-dir=`"$profile`"", "--print-to-pdf=`"$tmp`"", "http://127.0.0.1:$port/projects/$Slug/")
  $p = Start-Process -FilePath $chrome -ArgumentList $a -PassThru -WindowStyle Hidden
  if (-not $p.WaitForExit(60000)) { $p.Kill(); throw 'Chrome timed out' }
  Stop-Process -Id $srv.Id -Force
  node engine/build.mjs | Out-Null   # put the normal site back
  if (-not (Test-Path $tmp)) { throw 'Chrome did not produce a PDF' }
  try { Move-Item $tmp $out -Force -ErrorAction Stop }
  catch { throw "Could not replace '$Name'. Close it in any PDF viewer and run this again. The new PDF is at $tmp" }
  Get-Item $out | Select-Object Name, Length, LastWriteTime
} finally { Pop-Location }
