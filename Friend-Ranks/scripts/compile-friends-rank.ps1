param(
    [Parameter(Mandatory = $true)]
    [string]$ReducedCsdkPath,
    [string]$AddonName = "friends_rank"
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$validator = Join-Path $PSScriptRoot "validate-friends-rank.js"
$sourceFiles = @(
    "panorama\layout\profile_card.xml",
    "panorama\layout\citadel_db_page_profile.xml",
    "panorama\layout\post_game\citadel_db_post_game_scoreboard_new.xml",
    "panorama\layout\post_game\citadel_db_post_game_team.xml",
    "panorama\styles\friends_rank.css",
    "panorama\styles\friends_rank_scoreboard.css",
    "panorama\scripts\friends_rank_config.js",
    "panorama\scripts\friends_rank.js",
    "panorama\scripts\friends_rank_scoreboard.js",
    "panorama\images\friends_rank\statlocker_logo_green.vtex"
)
$copyOnlyFiles = @(
    "panorama\images\friends_rank\statlocker_logo_green.png"
)

Write-Host "[validate] Friends Rank" -ForegroundColor Cyan
& node $validator
if ($LASTEXITCODE -ne 0) {
    throw "La validacion de Friends Rank fallo con codigo $LASTEXITCODE"
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
    throw "No se encontro resourcecompiler.exe dentro de $csdkRoot"
}
if (-not (Test-Path -LiteralPath (Join-Path $gamePath "gameinfo.gi") -PathType Leaf)) {
    throw "Reduced CSDK no contiene game\citadel\gameinfo.gi: $csdkRoot"
}

Write-Host "[sync] $contentRoot" -ForegroundColor Cyan
foreach ($relativePath in ($sourceFiles + $copyOnlyFiles)) {
    $source = Join-Path $projectRoot $relativePath
    $destination = Join-Path $contentRoot $relativePath
    $destinationDirectory = Split-Path -Parent $destination
    if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
        throw "Falta la fuente $relativePath"
    }
    if (-not (Test-Path -LiteralPath $destinationDirectory)) {
        New-Item -ItemType Directory -Path $destinationDirectory -Force | Out-Null
    }
    Copy-Item -LiteralPath $source -Destination $destination -Force
}

Write-Host "[compile] $compiler" -ForegroundColor Cyan
Push-Location (Split-Path -Parent $compiler)
try {
    foreach ($relativePath in $sourceFiles) {
        $inputFile = Join-Path $contentRoot $relativePath
        Write-Host "  $relativePath"
        & $compiler -game $gamePath -danger_mode_ignore_schema_mismatches -nop4 -f -i $inputFile
        if ($LASTEXITCODE -ne 0) {
            throw "resourcecompiler fallo para $relativePath con codigo $LASTEXITCODE"
        }
    }
} finally {
    Pop-Location
}

foreach ($relativePath in $sourceFiles) {
    $compiledRelative = $relativePath.Replace(".xml", ".vxml_c").Replace(".css", ".vcss_c").Replace(".js", ".vjs_c").Replace(".vtex", ".vtex_c")
    $compiledFile = Join-Path $compiledRoot $compiledRelative
    $sourceFile = Join-Path $contentRoot $relativePath
    if (-not (Test-Path -LiteralPath $compiledFile -PathType Leaf)) {
        throw "No se genero $compiledRelative"
    }
    if ((Get-Item -LiteralPath $compiledFile).LastWriteTimeUtc -lt (Get-Item -LiteralPath $sourceFile).LastWriteTimeUtc) {
        throw "La compilacion no actualizo $compiledRelative"
    }
}

Write-Host "OK: assets compilados en $compiledRoot" -ForegroundColor Green
Write-Output $compiledRoot
