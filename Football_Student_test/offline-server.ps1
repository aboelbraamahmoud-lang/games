# Pure Windows PowerShell 5.1 static localhost server. No internet or external installation.
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath($PSScriptRoot)
$port = 8765
$listener = New-Object System.Net.Sockets.TcpListener([Net.IPAddress]::Loopback, $port)
try { $listener.Start() } catch { Write-Host 'Port 8765 is occupied. Please close the other game window.'; Read-Host 'Press Enter'; exit 1 }
$types = @{'.html'='text/html; charset=utf-8'; '.js'='text/javascript; charset=utf-8';'.css'='text/css; charset=utf-8';'.json'='application/json';'.png'='image/png';'.jpg'='image/jpeg';'.svg'='image/svg+xml';'.bin'='application/octet-stream';'.mp3'='audio/mpeg';'.txt'='text/plain; charset=utf-8'}
$url='http://127.0.0.1:'+$port+'/'
Start-Process $url
Write-Host ('OFFLINE FOOTBALL - '+$url)
Write-Host 'Keep this window open during the game. Close it to stop the local server.'
while ($true) {
 $client=$null
 try {
  $client=$listener.AcceptTcpClient()
  $client.ReceiveTimeout=6000; $client.SendTimeout=6000
  $stream=$client.GetStream()
  $reader=New-Object IO.StreamReader($stream,[Text.Encoding]::ASCII,$false,1024,$true)
  $line=$reader.ReadLine()
  if ([string]::IsNullOrEmpty($line)) {continue}
  $parts=$line.Split(' ')
  $rawPath=$parts[1].Split('?')[0]
  do { $h=$reader.ReadLine() } while ($h -ne $null -and $h -ne '')
  $requestPath=[Uri]::UnescapeDataString($rawPath)
  $relative=$requestPath.TrimStart('/').Replace('/',[IO.Path]::DirectorySeparatorChar)
  if (!$relative) { $relative='index.html' }
  $p=[IO.Path]::GetFullPath([IO.Path]::Combine($root,$relative))
  $allowed=($p -eq $root) -or $p.StartsWith($root+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)
  if (!$allowed) { $code='403 Forbidden'; $bytes=[Text.Encoding]::UTF8.GetBytes('Forbidden'); $type='text/plain' }
  elseif (-not [IO.File]::Exists($p)) { $code='404 Not Found'; $bytes=[Text.Encoding]::UTF8.GetBytes('Not Found'); $type='text/plain' }
  else { $code='200 OK'; $bytes=[IO.File]::ReadAllBytes($p); $ext=[IO.Path]::GetExtension($p).ToLowerInvariant(); $type=if($types.ContainsKey($ext)){$types[$ext]}else{'application/octet-stream'} }
  $header=[Text.Encoding]::ASCII.GetBytes("HTTP/1.1 $code`r`nContent-Type: $type`r`nContent-Length: $($bytes.Length)`r`nCache-Control: no-store`r`nConnection: close`r`n`r`n")
  $stream.Write($header,0,$header.Length);$stream.Write($bytes,0,$bytes.Length);$stream.Flush()
 }catch {Write-Warning $_.Exception.Message}finally{if($client){$client.Close()}}
}
