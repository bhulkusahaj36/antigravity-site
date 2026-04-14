$dir = 'c:\Users\sahaj.patel\Downloads\Antigravity Test'
$files = Get-ChildItem "$dir\*.html"
foreach ($f in $files) {
    $c = [System.IO.File]::ReadAllText($f.FullName)
    $c = $c.Replace('style.css?v=3.6', 'style.css?v=3.7')
    [System.IO.File]::WriteAllText($f.FullName, $c)
}
Write-Host "Done - bumped CSS version to 3.7 in $($files.Count) files"
