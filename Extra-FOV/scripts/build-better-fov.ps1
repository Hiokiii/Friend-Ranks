param(
    [Parameter(Mandatory = $true)]
    [string]$ReducedCsdkPath,
    [Parameter(Mandatory = $true)]
    [string]$VpkEditCliPath,
    [string]$OutputPath = ".\build\pak89_dir.vpk"
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$compileScript = Join-Path $PSScriptRoot "compile-better-fov.ps1"

& $compileScript -ReducedCsdkPath $ReducedCsdkPath
if ($LASTEXITCODE -ne 0) {
    throw "Better FOV compilation failed with code $LASTEXITCODE"
}

$csdkRoot = (Resolve-Path -LiteralPath $ReducedCsdkPath).Path
$compiledRoot = Join-Path $csdkRoot "game\citadel_addons\better_fov"
$requiredAssets = @(
    "panorama/layout/popups/popup_settings.vxml_c"
)
$vpkEditCli = (Resolve-Path -LiteralPath $VpkEditCliPath).Path
$outputFullPath = if ([System.IO.Path]::IsPathRooted($OutputPath)) {
    [System.IO.Path]::GetFullPath($OutputPath)
} else {
    [System.IO.Path]::GetFullPath((Join-Path $projectRoot $OutputPath))
}
$outputDirectory = Split-Path -Parent $outputFullPath
$temporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("better-fov-build-" + [guid]::NewGuid().ToString("N"))
$stagingRoot = Join-Path $temporaryRoot "staging"
foreach ($requiredAsset in $requiredAssets) {
    $compiledAsset = Join-Path $compiledRoot ($requiredAsset.Replace("/", [System.IO.Path]::DirectorySeparatorChar))
    if (-not (Test-Path -LiteralPath $compiledAsset -PathType Leaf)) {
        throw "Compiled asset is missing: $compiledAsset"
    }
}
if (-not (Test-Path -LiteralPath $outputDirectory)) {
    New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
}

try {
    foreach ($requiredAsset in $requiredAssets) {
        $compiledAsset = Join-Path $compiledRoot ($requiredAsset.Replace("/", [System.IO.Path]::DirectorySeparatorChar))
        $stagedAsset = Join-Path $stagingRoot ($requiredAsset.Replace("/", [System.IO.Path]::DirectorySeparatorChar))
        New-Item -ItemType Directory -Path (Split-Path -Parent $stagedAsset) -Force | Out-Null
        Copy-Item -LiteralPath $compiledAsset -Destination $stagedAsset -Force
    }

    Write-Host "[pack] $outputFullPath" -ForegroundColor Cyan
    & $vpkEditCli $stagingRoot -o $outputFullPath -s --no-progress
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $outputFullPath -PathType Leaf)) {
        throw "VPKEdit CLI could not create $outputFullPath"
    }

    foreach ($requiredAsset in $requiredAssets) {
        $verificationFile = Join-Path $temporaryRoot ([System.IO.Path]::GetFileName($requiredAsset))
        & $vpkEditCli $outputFullPath -e $requiredAsset -o $verificationFile --no-progress
        if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $verificationFile -PathType Leaf)) {
            throw "The VPK does not contain $requiredAsset"
        }
    }
} finally {
    if (Test-Path -LiteralPath $temporaryRoot) {
        Remove-Item -LiteralPath $temporaryRoot -Recurse -Force
    }
}

Write-Host "OK: Better FOV VPK created and verified: $outputFullPath" -ForegroundColor Green
