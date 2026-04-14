$dir = 'c:\Users\sahaj.patel\Downloads\Antigravity Test'
$files = [System.IO.Directory]::GetFiles($dir, '*.html')
foreach ($f in $files) {
    $c = [System.IO.File]::ReadAllText($f)
    $c = $c.Replace('style.css?v=3.7', 'style.css?v=3.8')
    [System.IO.File]::WriteAllText($f, $c)
}
Write-Host "Done - bumped CSS version to 3.8 in $($files.Count) files"
