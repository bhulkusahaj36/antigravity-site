$files = @('prasang.html','paravani.html','search.html','category-detail.html')
foreach ($f in $files) {
    $p = Join-Path $PSScriptRoot $f
    if (!(Test-Path $p)) { Write-Host "SKIP $f"; continue }
    $c = [System.IO.File]::ReadAllText($p)
    $busTag = "`r`n    <script src=`"js/bus.js`"></script>`r`n    <script src=`"js/api.js`"></script>"
    if ($c -match 'js/bus\.js') {
        Write-Host "ALREADY $f"
        continue
    }
    if ($c -match 'js/animations\.js') {
        $c = [System.Text.RegularExpressions.Regex]::Replace($c, '(js/animations\.js[^>]*></script>)', "`$1$busTag")
        [System.IO.File]::WriteAllText($p, $c)
        Write-Host "OK $f (after animations.js)"
    } elseif ($c -match 'js/data\.js') {
        $c = [System.Text.RegularExpressions.Regex]::Replace($c, '(js/data\.js[^>]*></script>)', "`$1$busTag")
        [System.IO.File]::WriteAllText($p, $c)
        Write-Host "OK $f (after data.js)"
    } else {
        Write-Host "NO MATCH $f"
    }
}
