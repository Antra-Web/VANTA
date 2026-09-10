# VANTA Local HTTP Server Script
$ports = 3000, 8081, 8082, 9000
$listener = $null
$selectedPort = 0

foreach ($port in $ports) {
    try {
        $l = New-Object System.Net.HttpListener
        $l.Prefixes.Add("http://localhost:$port/")
        $l.Start()
        $listener = $l
        $selectedPort = $port
        break
    } catch {
        # Port busy, try next
    }
}

if (-not $listener) {
    Write-Host "Failed to start HTTP listener on test ports." -ForegroundColor Red
    exit 1
}

$url = "http://localhost:$selectedPort/"
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host " VANTA Luxury Automotive Web Server Running!" -ForegroundColor Green
Write-Host " URL: $url" -ForegroundColor Yellow
Write-Host " Press Ctrl+C to stop the server." -ForegroundColor Gray
Write-Host "====================================================" -ForegroundColor Cyan

# Open default browser automatically
Start-Process $url

$root = $PSScriptRoot

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $relPath = $request.Url.LocalPath.TrimStart('/')
        if ([string]::IsNullOrWhiteSpace($relPath)) {
            $relPath = "index.html"
        }

        $filePath = Join-Path $root $relPath.Replace('/', '\')

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            switch ($ext) {
                ".html" { $response.ContentType = "text/html" }
                ".css"  { $response.ContentType = "text/css" }
                ".js"   { $response.ContentType = "application/javascript" }
                ".jpg"  { $response.ContentType = "image/jpeg" }
                ".jpeg" { $response.ContentType = "image/jpeg" }
                ".png"  { $response.ContentType = "image/png" }
                ".svg"  { $response.ContentType = "image/svg+xml" }
                ".json" { $response.ContentType = "application/json" }
                default { $response.ContentType = "application/octet-stream" }
            }

            try {
                $bytes = [System.IO.File]::ReadAllBytes($filePath)
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            } catch {
                $response.StatusCode = 500
            }
        } else {
            $response.StatusCode = 404
            $buffer = [System.Text.Encoding]::UTF8.GetBytes("404 - Not Found")
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
        }

        $response.Close()
    }
} finally {
    if ($listener) {
        $listener.Stop()
        $listener.Close()
    }
}
