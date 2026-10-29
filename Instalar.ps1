$ErrorActionPreference = 'Stop'
$staging = $null
try {
 if (Get-Process Photoshop -ErrorAction SilentlyContinue) { throw 'Feche o Photoshop antes de instalar.' }
 $source = Join-Path $PSScriptRoot 'Central_Producao'
 $required = @('CSXS\manifest.xml','jsx\host.jsx','index.html','panel.js','style.css','icons\icon23.png','icons\icon23_dark.png','icons\icon23_disabled.png','icons\icon46.png','icons\icon46_dark.png')
 foreach ($file in $required) {
  if (!(Test-Path -LiteralPath (Join-Path $source $file))) { throw 'Extraia o ZIP inteiro antes de executar Instalar.cmd.' }
 }
 $extensions = Join-Path $env:APPDATA 'Adobe\CEP\extensions'
 New-Item -ItemType Directory -Path $extensions -Force | Out-Null
 $found = @(Get-ChildItem -LiteralPath $extensions -Directory | Where-Object {
  $m = Join-Path $_.FullName 'CSXS\manifest.xml'
  if (Test-Path -LiteralPath $m) {
   try { [xml]$xml = Get-Content -LiteralPath $m -Raw
    @($xml.ExtensionManifest.ExtensionList.Extension | Where-Object { $_.Id -eq 'com.domingos.centralproducao.panel' }).Count -gt 0
   } catch { $false }
  } else { $false }
 })
 if ($found.Count -gt 1) { throw 'Existem instalacoes duplicadas da Central de Producao. Remova as duplicadas antes de instalar.' }
 $dest = Join-Path $extensions 'Central_Producao'
 if ($found.Count -eq 1) { $dest = $found[0].FullName }
 elseif (Test-Path -LiteralPath $dest) { throw 'A pasta Central_Producao existe e nao foi reconhecida. Renomeie essa pasta antes de instalar.' }
 $backupRoot = Join-Path $env:APPDATA 'CentralProducao\Backups'
 New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
 $stamp = [Guid]::NewGuid().ToString('N')
 $staging = Join-Path $backupRoot ('preparando-'+$stamp)
 Copy-Item -LiteralPath $source -Destination $staging -Recurse
 foreach ($file in $required) {
  $original = Join-Path $source $file
  $copied = Join-Path $staging $file
  if (!(Test-Path -LiteralPath $copied) -or ((Get-FileHash -LiteralPath $original).Hash -ne (Get-FileHash -LiteralPath $copied).Hash)) { throw 'Falha ao copiar o pacote. A instalacao anterior foi preservada.' }
 }
 foreach ($v in @(9,10,11,12)) {
  $reg = 'HKCU:\Software\Adobe\CSXS.' + $v
  New-Item -Path $reg -Force | Out-Null
  New-ItemProperty -Path $reg -Name PlayerDebugMode -Value '1' -PropertyType String -Force | Out-Null
 }
 $backup = $null
 if (Test-Path -LiteralPath $dest) {
  $backup = Join-Path $backupRoot ('anterior-'+$stamp)
  Move-Item -LiteralPath $dest -Destination $backup
 }
 try { Move-Item -LiteralPath $staging -Destination $dest; $staging = $null }
 catch { if ($backup) { Move-Item -LiteralPath $backup -Destination $dest }; throw }
 Write-Host 'Central de Producao 1.1.1 + roda instalada!' -ForegroundColor Green
 Write-Host 'Abra Photoshop > Janela > Extensoes (herdadas) > Central de Producao.'
 if ($backup) { Write-Host "Backup anterior: $backup" }
} catch { Write-Host $_.Exception.Message -ForegroundColor Red; exit 1 }
finally { if ($staging -and (Test-Path -LiteralPath $staging)) { Remove-Item -LiteralPath $staging -Recurse -Force } }
