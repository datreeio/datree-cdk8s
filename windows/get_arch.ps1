#Requires -Version 5

$osArchitecture = if([Environment]::Is64BitProcess) { 'x86_64' } else { '386' }

Write-Host $osArchitecture