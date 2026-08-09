param(
    [switch]$ValidateOnly,
    [string]$ReducedCsdkPath = "",
    [string]$CompilerPath = "",
    [string]$VpkEditCliPath = "",
    [string]$CompiledPanoramaPath = "",
    [string]$OutputPath = ""
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$validator = Join-Path $PSScriptRoot "validate-friends-rank.js"

Write-Host "[validate] Friends Rank" -ForegroundColor Cyan
& node $validator
if ($LASTEXITCODE -ne 0) {
    throw "La validación de Friends Rank falló con código $LASTEXITCODE"
}

if ($ValidateOnly) {
    Write-Host "OK: fuentes listas para compilar" -ForegroundColor Green
    exit 0
}

if ($ReducedCsdkPath) {
    $compileScript = Join-Path $PSScriptRoot "compile-friends-rank.ps1"
    & $compileScript -ReducedCsdkPath $ReducedCsdkPath
    if ($LASTEXITCODE -ne 0) {
        throw "La compilacion con Reduced CSDK fallo con codigo $LASTEXITCODE"
    }
    $resolvedCsdk = (Resolve-Path -LiteralPath $ReducedCsdkPath).Path
    $CompiledPanoramaPath = Join-Path $resolvedCsdk "game\citadel_addons\friends_rank"
}

if ($CompilerPath) {
    $resolvedCompiler = (Resolve-Path -LiteralPath $CompilerPath).Path
    Write-Host "[compile] $resolvedCompiler" -ForegroundColor Cyan
    & $resolvedCompiler $projectRoot
    if ($LASTEXITCODE -ne 0) {
        throw "El compilador Source 2 falló con código $LASTEXITCODE"
    }
}

if (-not $CompiledPanoramaPath) {
    Write-Host "Validación terminada. Compila la carpeta Friend-Ranks con CSDK/sr2compiler." -ForegroundColor Yellow
    Write-Host "Después usa -CompiledPanoramaPath, -VpkEditCliPath y -OutputPath para empaquetar." -ForegroundColor Yellow
    exit 0
}

if (-not $VpkEditCliPath -or -not $OutputPath) {
    throw "Para empaquetar debes indicar -VpkEditCliPath y -OutputPath."
}

$compiledRoot = (Resolve-Path -LiteralPath $CompiledPanoramaPath).Path
$vpkEditCli = (Resolve-Path -LiteralPath $VpkEditCliPath).Path
$outputFullPath = if ([System.IO.Path]::IsPathRooted($OutputPath)) {
    [System.IO.Path]::GetFullPath($OutputPath)
} else {
    [System.IO.Path]::GetFullPath((Join-Path $projectRoot $OutputPath))
}
$outputDirectory = Split-Path -Parent $outputFullPath
$requiredAssets = @(
    "panorama/layout/profile_card.vxml_c",
    "panorama/layout/citadel_db_page_profile.vxml_c",
    "panorama/layout/post_game/citadel_db_post_game_scoreboard_new.vxml_c",
    "panorama/layout/post_game/citadel_db_post_game_team.vxml_c",
    "panorama/styles/friends_rank.vcss_c",
    "panorama/styles/friends_rank_scoreboard.vcss_c",
    "panorama/scripts/friends_rank_config.vjs_c",
    "panorama/scripts/friends_rank.vjs_c",
    "panorama/scripts/friends_rank_scoreboard.vjs_c",
    "panorama/images/friends_rank/statlocker_logo_green.vtex_c"
)

if (-not (Test-Path -LiteralPath (Join-Path $compiledRoot "panorama"))) {
    throw "La carpeta compilada debe contener panorama\: $compiledRoot"
}
foreach ($requiredAsset in $requiredAssets) {
    $sourceAsset = Join-Path $compiledRoot ($requiredAsset.Replace("/", [System.IO.Path]::DirectorySeparatorChar))
    if (-not (Test-Path -LiteralPath $sourceAsset -PathType Leaf)) {
        throw "La salida compilada no contiene $requiredAsset"
    }

    $sourceRelative = $requiredAsset
    $sourceRelative = $sourceRelative.Replace(".vxml_c", ".xml")
    $sourceRelative = $sourceRelative.Replace(".vcss_c", ".css")
    $sourceRelative = $sourceRelative.Replace(".vjs_c", ".js")
    $sourceRelative = $sourceRelative.Replace(".vtex_c", ".vtex")
    $projectSource = Join-Path $projectRoot ($sourceRelative.Replace("/", [System.IO.Path]::DirectorySeparatorChar))
    if ((Test-Path -LiteralPath $projectSource -PathType Leaf) -and
        (Get-Item -LiteralPath $sourceAsset).LastWriteTimeUtc -lt (Get-Item -LiteralPath $projectSource).LastWriteTimeUtc) {
        throw "La salida compilada está desactualizada para $requiredAsset. Ejecuta Compile All Assets antes de empaquetar."
    }
}
if (-not (Test-Path -LiteralPath $outputDirectory)) {
    New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
}

$temporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("friends-rank-build-" + [guid]::NewGuid().ToString("N"))
$stagingRoot = Join-Path $temporaryRoot "staging"
$verificationRoot = Join-Path $temporaryRoot "verification"

try {
    New-Item -ItemType Directory -Path $stagingRoot, $verificationRoot -Force | Out-Null
    foreach ($requiredAsset in $requiredAssets) {
        $sourceAsset = Join-Path $compiledRoot ($requiredAsset.Replace("/", [System.IO.Path]::DirectorySeparatorChar))
        $stagedAsset = Join-Path $stagingRoot ($requiredAsset.Replace("/", [System.IO.Path]::DirectorySeparatorChar))
        $stagedDirectory = Split-Path -Parent $stagedAsset
        if (-not (Test-Path -LiteralPath $stagedDirectory)) {
            New-Item -ItemType Directory -Path $stagedDirectory -Force | Out-Null
        }
        Copy-Item -LiteralPath $sourceAsset -Destination $stagedAsset -Force
    }

    Write-Host "[pack] $outputFullPath" -ForegroundColor Cyan
    & $vpkEditCli $stagingRoot -o $outputFullPath -s --no-progress
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $outputFullPath -PathType Leaf)) {
        throw "VPKEdit CLI no pudo crear $outputFullPath"
    }

    foreach ($requiredAsset in $requiredAssets) {
        $verificationFile = Join-Path $verificationRoot ([System.IO.Path]::GetFileName($requiredAsset))
        & $vpkEditCli $outputFullPath -e $requiredAsset -o $verificationFile --no-progress
        if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $verificationFile -PathType Leaf)) {
            throw "El VPK no contiene $requiredAsset"
        }
    }
} finally {
    if (Test-Path -LiteralPath $temporaryRoot) {
        Remove-Item -LiteralPath $temporaryRoot -Recurse -Force
    }
}

Write-Host "OK: VPK creado y verificado: $outputFullPath" -ForegroundColor Green
