# Makes the home-screen and browser icons from one 16x16 DawnLike sprite.
# For development only; it is not part of the game. The output goes to assets/ui/.
#
# To use a different sprite, pick its sheet, column and row (counting from 0, 16 px per tile):
#   powershell -ExecutionPolicy Bypass -File tools/make-icons.ps1 -Sheet Characters/Player0.png -Column 1 -Row 3
# Sprites are only ever enlarged by whole numbers, so the pixels stay crisp.

param(
  [string]$Sheet = 'Characters/Player0.png',
  [int]$Column = 1,
  [int]$Row = 3
)

Add-Type -AssemblyName System.Drawing
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$sheetPath = Join-Path $root (Join-Path 'assets/dawnlike' $Sheet)
$outDir = Join-Path $root 'assets/ui'

$box = [System.Drawing.ColorTranslator]::FromHtml('#161a33')   # the DM window colour
$frame = [System.Drawing.ColorTranslator]::FromHtml('#f0c85a') # the gold accent

$sheetImage = [System.Drawing.Bitmap]::FromFile($sheetPath)
$sprite = $sheetImage.Clone((New-Object System.Drawing.Rectangle ($Column * 16), ($Row * 16), 16, 16), $sheetImage.PixelFormat)
$sheetImage.Dispose()

# name: file name; size: icon size; scale: whole-number enlargement; frameWidth: 0 for none
function New-Icon([string]$name, [int]$size, [int]$scale, [int]$frameWidth, [bool]$transparent) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  if ($transparent) { $g.Clear([System.Drawing.Color]::Transparent) } else { $g.Clear($box) }
  if ($frameWidth -gt 0) {
    $inset = $frameWidth * 3
    $brush = New-Object System.Drawing.SolidBrush $frame
    $inner = $size - 2 * $inset
    $g.FillRectangle($brush, $inset, $inset, $inner, $frameWidth)
    $g.FillRectangle($brush, $inset, $size - $inset - $frameWidth, $inner, $frameWidth)
    $g.FillRectangle($brush, $inset, $inset, $frameWidth, $inner)
    $g.FillRectangle($brush, $size - $inset - $frameWidth, $inset, $frameWidth, $inner)
    $brush.Dispose()
  }
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
  $drawn = 16 * $scale
  $offset = [int](($size - $drawn) / 2)
  $g.DrawImage($sprite, $offset, $offset, $drawn, $drawn)
  $bmp.Save((Join-Path $outDir $name), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
  Write-Host "Made assets/ui/$name"
}

New-Icon 'icon-512.png' 512 24 8 $false            # install icon, with a gold frame
New-Icon 'icon-192.png' 192 9 3 $false             # smaller install icon
New-Icon 'icon-maskable-512.png' 512 18 0 $false   # Android shapes this one; the sprite stays in the safe middle
New-Icon 'apple-touch-icon.png' 180 9 0 $false     # iPhone home screen (iOS rounds the corners itself)
New-Icon 'favicon-32.png' 32 2 0 $true             # browser tab

$sprite.Dispose()
