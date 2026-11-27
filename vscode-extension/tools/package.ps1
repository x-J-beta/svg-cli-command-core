$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
$extensionRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$manifest = Get-Content -Raw -LiteralPath (Join-Path $extensionRoot 'package.json') | ConvertFrom-Json
$output = Join-Path $extensionRoot "dist/$($manifest.name)-$($manifest.version).vsix"
$archive = [IO.Compression.ZipArchive]::new([IO.File]::Open($output, [IO.FileMode]::Create), [IO.Compression.ZipArchiveMode]::Create)
try {
  $files = @{
    'package.json' = 'extension/package.json'
    'README.md' = 'extension/README.md'
    'dist/extension.js' = 'extension/dist/extension.js'
    'dist/SvgFileDecorationProvider.js' = 'extension/dist/SvgFileDecorationProvider.js'
    'dist/SvgOutlineNode.js' = 'extension/dist/SvgOutlineNode.js'
    'dist/SvgOutlineParser.js' = 'extension/dist/SvgOutlineParser.js'
    'dist/SvgDocumentSymbolProvider.js' = 'extension/dist/SvgDocumentSymbolProvider.js'
    'examples/outline.svg' = 'extension/examples/outline.svg'
    'packaging/extension.vsixmanifest' = 'extension.vsixmanifest'
    'packaging/content-types.xml' = '[Content_Types].xml'
  }
  foreach ($dependency in @('saxes', 'xmlchars')) {
    $dependencyRoot = Join-Path $extensionRoot "node_modules/$dependency"
    foreach ($file in Get-ChildItem -LiteralPath $dependencyRoot -Recurse -File) {
      if ($file.Extension -eq '.js' -or $file.Name -eq 'package.json' -or $file.Name -eq 'LICENSE') {
        $relative = $file.FullName.Substring($dependencyRoot.Length + 1).Replace('\', '/')
        $files[$file.FullName] = "extension/node_modules/$dependency/$relative"
      }
    }
  }
  foreach ($source in $files.Keys) {
    $entry = $archive.CreateEntry($files[$source])
    $stream = $entry.Open()
    $sourcePath = if ([IO.Path]::IsPathRooted($source)) { $source } else { Join-Path $extensionRoot $source }
    $inputStream = [IO.File]::OpenRead($sourcePath)
    try { $inputStream.CopyTo($stream) }
    finally { $inputStream.Dispose(); $stream.Dispose() }
  }
} finally { $archive.Dispose() }
Write-Output $output
