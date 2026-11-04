$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
$request = [Console]::In.ReadToEnd() | ConvertFrom-Json
Add-Type -AssemblyName System.Runtime.WindowsRuntime
[Windows.Storage.StorageFile, Windows.Storage, ContentType=WindowsRuntime] | Out-Null
[Windows.Storage.Streams.IRandomAccessStream, Windows.Storage.Streams, ContentType=WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.BitmapDecoder, Windows.Foundation, ContentType=WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.SoftwareBitmap, Windows.Foundation, ContentType=WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.BitmapTransform, Windows.Foundation, ContentType=WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.BitmapBounds, Windows.Foundation, ContentType=WindowsRuntime] | Out-Null
[Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType=WindowsRuntime] | Out-Null
[Windows.Media.Ocr.OcrResult, Windows.Foundation, ContentType=WindowsRuntime] | Out-Null
$asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetGenericArguments().Count -eq 1 -and
  $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
} | Select-Object -First 1

function Wait-WinRt($Operation, [Type]$ResultType) {
  $task = $asTask.MakeGenericMethod($ResultType).Invoke($null, @($Operation))
  return ,($task.GetAwaiter().GetResult())
}

$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
if ($null -eq $engine) { throw 'OCR indisponivel' }
$maximum = [int][Windows.Media.Ocr.OcrEngine]::MaxImageDimension
$step = [Math]::Max(1, $maximum - 64)
$cache = @{}
$results = New-Object System.Collections.Generic.List[Object]
$errors = 0
foreach ($file in $request.files) {
  if ($cache.ContainsKey($file.sha256)) {
    $entry = $cache[$file.sha256]
    $results.Add([pscustomobject]@{ path=$file.path; sha256=$file.sha256; status=$entry.status; findings=$entry.findings; tiles=$entry.tiles })
    continue
  }
  $stream = $null
  $phase = 'file'
  try {
    $full = [IO.Path]::GetFullPath((Join-Path $request.root $file.path))
    $storage = Wait-WinRt ([Windows.Storage.StorageFile]::GetFileFromPathAsync($full)) ([Windows.Storage.StorageFile])
    $phase = 'stream'
    $stream = Wait-WinRt ($storage.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
    $phase = 'decoder'
    $decoder = Wait-WinRt ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
    $found = @{}
    $tiles = 0
    for ($top = 0; $top -lt $decoder.PixelHeight; $top += $step) {
      for ($left = 0; $left -lt $decoder.PixelWidth; $left += $step) {
        $phase = 'bounds'
        $bounds = New-Object Windows.Graphics.Imaging.BitmapBounds
        $bounds.X = [uint32]$left
        $bounds.Y = [uint32]$top
        $bounds.Width = [uint32][Math]::Min($maximum, $decoder.PixelWidth - $left)
        $bounds.Height = [uint32][Math]::Min($maximum, $decoder.PixelHeight - $top)
        $transform = New-Object Windows.Graphics.Imaging.BitmapTransform
        $transform.ScaledWidth = $decoder.PixelWidth
        $transform.ScaledHeight = $decoder.PixelHeight
        $transform.Bounds = $bounds
        $phase = 'bitmap'
        $bitmap = Wait-WinRt ($decoder.GetSoftwareBitmapAsync(
          [Windows.Graphics.Imaging.BitmapPixelFormat]::Bgra8,
          [Windows.Graphics.Imaging.BitmapAlphaMode]::Ignore,
          $transform,
          [Windows.Graphics.Imaging.ExifOrientationMode]::IgnoreExifOrientation,
          [Windows.Graphics.Imaging.ColorManagementMode]::DoNotColorManage
        )) ([Windows.Graphics.Imaging.SoftwareBitmap])
        try {
          $phase = 'recognize'
          $ocr = Wait-WinRt ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
          $tiles += 1
          foreach ($pattern in $request.patterns) {
            $flags = [System.Text.RegularExpressions.RegexOptions]::None
            if ($pattern.flags.Contains('i')) { $flags = [System.Text.RegularExpressions.RegexOptions]::IgnoreCase }
            $count = [regex]::Matches($ocr.Text, $pattern.source, $flags).Count
            if ($count -gt 0) { $found[$pattern.kind] = [int]$found[$pattern.kind] + $count }
          }
          foreach ($pattern in @(
            @{kind='service-credential'; source='x[\s_-]*service[\s_-]*token'},
            @{kind='storage-credential'; source='blob[\s_-]*read[\s_-]*write[\s_-]*token'},
            @{kind='session-cookie'; source='origem[\s_]*sessao\s*='}
          )) {
            $count = [regex]::Matches($ocr.Text, $pattern.source, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase).Count
            if ($count -gt 0) { $found[$pattern.kind] = [int]$found[$pattern.kind] + $count }
          }
        } finally { $bitmap.Dispose() }
      }
    }
    $findings = @($found.Keys | Sort-Object | ForEach-Object { [pscustomobject]@{kind=$_; count=$found[$_]} })
    $entry = [pscustomobject]@{status='ok'; findings=$findings; tiles=$tiles}
  } catch {
    $errors += 1
    $entry = [pscustomobject]@{status='unreadable'; findings=@(); tiles=0; phase=$phase}
  } finally { if ($null -ne $stream) { $stream.Dispose() } }
  $cache[$file.sha256] = $entry
  $results.Add([pscustomobject]@{ path=$file.path; sha256=$file.sha256; status=$entry.status; findings=$entry.findings; tiles=$entry.tiles; phase=$entry.phase })
}
$affected = @($results | Where-Object { $_.findings.Count -gt 0 }).Count
[pscustomobject]@{scanned=$results.Count; uniqueScanned=$cache.Count; affected=$affected; errors=$errors; findings=$results.ToArray()} | ConvertTo-Json -Depth 8 -Compress
