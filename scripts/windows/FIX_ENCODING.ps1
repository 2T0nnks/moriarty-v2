# Fix Encoding Script for PowerShell Files
# This script fixes encoding issues that may occur when downloading files from GitHub
# Run this if you get parsing errors

Write-Host "Fixing encoding for PowerShell scripts..." -ForegroundColor Cyan

$files = @("setup.ps1", "bootstrap.ps1")

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "Processing $file..." -ForegroundColor Yellow
        
        # Read content with UTF-8
        $content = Get-Content -Path $file -Raw -Encoding UTF8
        
        # Write back with UTF-8 without BOM
        $utf8NoBom = New-Object System.Text.UTF8Encoding $false
        [System.IO.File]::WriteAllText((Resolve-Path $file), $content, $utf8NoBom)
        
        # Unblock the file
        Unblock-File -Path $file
        
        Write-Host "✓ Fixed $file" -ForegroundColor Green
    } else {
        Write-Host "✗ File not found: $file" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Done! Now you can run .\setup.ps1" -ForegroundColor Green
