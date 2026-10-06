# Questbound local test server. For development only; it is not part of the game.
# Serves this repo at http://localhost:8000/ so the browser can load ES modules.
# Start it with serve.cmd (double-click), and stop it by closing its window or pressing Ctrl+C.

param([int]$Port = 8000, [switch]$Open)

$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\') + '\'

$types = @{
  '.html' = 'text/html; charset=utf-8'
  '.js' = 'text/javascript; charset=utf-8'
  '.mjs' = 'text/javascript; charset=utf-8'
  '.css' = 'text/css; charset=utf-8'
  '.ink' = 'text/plain; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.webmanifest' = 'application/manifest+json; charset=utf-8'
  '.md' = 'text/plain; charset=utf-8'
  '.txt' = 'text/plain; charset=utf-8'
  '.png' = 'image/png'
  '.gif' = 'image/gif'
  '.svg' = 'image/svg+xml'
  '.ico' = 'image/x-icon'
  '.ttf' = 'font/ttf'
  '.woff' = 'font/woff'
  '.woff2' = 'font/woff2'
  '.mp3' = 'audio/mpeg'
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
try {
  $listener.Start()
} catch {
  Write-Host "Couldn't start on port $Port. A server may already be running there; try http://localhost:$Port/"
  if ($Open) { Start-Process "http://localhost:$Port/" }
  exit 1
}
Write-Host "Questbound test server running. Open http://localhost:$Port/ in your browser."
Write-Host "Close this window (or press Ctrl+C) to stop it."
if ($Open) { Start-Process "http://localhost:$Port/" }

try {
  while ($listener.IsListening) {
    # Wait in short steps so Ctrl+C can stop the server.
    $pending = $listener.GetContextAsync()
    while (-not $pending.AsyncWaitHandle.WaitOne(500)) { }
    $context = $pending.GetAwaiter().GetResult()
    $request = $context.Request
    $response = $context.Response
    try {
      $relative = [Uri]::UnescapeDataString($request.Url.AbsolutePath).TrimStart('/').Replace('/', '\')
      $path = [IO.Path]::GetFullPath([IO.Path]::Combine($root, $relative))
      if ([IO.Directory]::Exists($path)) {
        if (-not $request.Url.AbsolutePath.EndsWith('/')) {
          $response.Redirect($request.Url.AbsolutePath + '/')
          continue
        }
        $path = [IO.Path]::Combine($path, 'index.html')
      }
      if (-not $path.StartsWith($root, [StringComparison]::OrdinalIgnoreCase) -or -not [IO.File]::Exists($path)) {
        $response.StatusCode = 404
        $body = [Text.Encoding]::UTF8.GetBytes("Not found: $($request.Url.AbsolutePath)")
      } else {
        $extension = [IO.Path]::GetExtension($path).ToLowerInvariant()
        $type = $types[$extension]
        if (-not $type) { $type = 'application/octet-stream' }
        $response.ContentType = $type
        $body = [IO.File]::ReadAllBytes($path)
      }
      # Never cache during development, so edits show up on reload.
      $response.Headers.Add('Cache-Control', 'no-store')
      $response.ContentLength64 = $body.Length
      $response.OutputStream.Write($body, 0, $body.Length)
    } catch {
      Write-Host "Error serving $($request.Url.AbsolutePath): $($_.Exception.Message)"
    } finally {
      Write-Host "$($response.StatusCode) $($request.Url.AbsolutePath)"
      $response.Close()
    }
  }
} finally {
  $listener.Stop()
  $listener.Close()
}
