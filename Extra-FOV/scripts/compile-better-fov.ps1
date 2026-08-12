param(
    [Parameter(Mandatory = $true)]
    [string]$ReducedCsdkPath,
    [string]$AddonName = "better_fov"
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$relativePaths = @("panorama\layout\popups\popup_settings.xml")
$validator = Join-Path $PSScriptRoot "validate-better-fov.js"

Write-Host "[validate] Better FOV" -ForegroundColor Cyan
& node $validator
if ($LASTEXITCODE -ne 0) {
    throw "Better FOV validation failed with code $LASTEXITCODE"
}

$csdkRoot = (Resolve-Path -LiteralPath $ReducedCsdkPath).Path
$compilerCandidates = @(
    (Join-Path $csdkRoot "game\bin_server\win64\resourcecompiler.exe"),
    (Join-Path $csdkRoot "game\bin\win64\resourcecompiler.exe")
)
$compiler = $compilerCandidates | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
$gamePath = Join-Path $csdkRoot "game\citadel"
$contentRoot = Join-Path $csdkRoot ("content\citadel_addons\" + $AddonName)
$compiledRoot = Join-Path $csdkRoot ("game\citadel_addons\" + $AddonName)

if (-not $compiler) {
    throw "resourcecompiler.exe was not found inside $csdkRoot"
}
if (-not (Test-Path -LiteralPath (Join-Path $gamePath "gameinfo.gi") -PathType Leaf)) {
    throw "Reduced CSDK is missing game\citadel\gameinfo.gi: $csdkRoot"
}

foreach ($relativePath in $relativePaths) {
    $source = Join-Path $projectRoot $relativePath
    $destination = Join-Path $contentRoot $relativePath
    Write-Host "[sync] $destination" -ForegroundColor Cyan
    $destinationDirectory = Split-Path -Parent $destination
    if (-not (Test-Path -LiteralPath $destinationDirectory)) {
        New-Item -ItemType Directory -Path $destinationDirectory -Force | Out-Null
    }
    Copy-Item -LiteralPath $source -Destination $destination -Force
}

Write-Host "[compile] $compiler" -ForegroundColor Cyan
Push-Location (Split-Path -Parent $compiler)
try {
    foreach ($relativePath in $relativePaths) {
        $destination = Join-Path $contentRoot $relativePath
        & $compiler -game $gamePath -danger_mode_ignore_schema_mismatches -nop4 -f -i $destination
        if ($LASTEXITCODE -ne 0) {
            throw "resourcecompiler failed for $relativePath with code $LASTEXITCODE"
        }
    }
} finally {
    Pop-Location
}

$compiledFiles = @(
    @{ Source = "panorama\layout\popups\popup_settings.xml"; Output = "panorama\layout\popups\popup_settings.vxml_c" }
)
foreach ($asset in $compiledFiles) {
    $compiledFile = Join-Path $compiledRoot $asset.Output
    $sourceFile = Join-Path $contentRoot $asset.Source
    if (-not (Test-Path -LiteralPath $compiledFile -PathType Leaf)) {
        throw "$($asset.Output) was not generated"
    }
    if ((Get-Item -LiteralPath $compiledFile).LastWriteTimeUtc -lt (Get-Item -LiteralPath $sourceFile).LastWriteTimeUtc) {
        throw "$($asset.Output) is stale"
    }
}

Write-Host "OK: Better FOV assets compiled to $compiledRoot" -ForegroundColor Green
Write-Output $compiledRoot
