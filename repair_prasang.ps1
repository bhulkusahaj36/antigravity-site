$content = [System.IO.File]::ReadAllText("$PSScriptRoot\prasang.html")

# The file has duplicate body content - extract the correct first part (up to the first footer-links block)
# and the correct scripts block at the end, then stitch them together

$correctEnd = @"
                <a href="paravani.html">પરાવાણી</a>
                <a href="search.html">Search</a>
            </div>
        </div>
    </footer>

    <script src="js/data.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
    <script src="js/animations.js"></script>
    <script src="js/bus.js"></script>
    <script src="js/api.js"></script>
    <script src="js/utils.js"></script>
    <script src="js/prasang.js"></script>
    <script src="js/particles.js"></script>
</body>

</html>
"@

# Find the first occurrence of footer-links with prasangs.html link and cut after it
$pattern = [regex]::new('(<a href="prasangs\.html">.*?</a>)\r?\n\s*</a>')
$match = $pattern.Match($content)
if ($match.Success) {
    $cutAt = $match.Index + $match.Length
    $cleanContent = $content.Substring(0, $match.Index) + "`r`n                <a href=`"prasangs.html`">પ્રસંગો</a>" + "`r`n" + $correctEnd
    [System.IO.File]::WriteAllText("$PSScriptRoot\prasang.html", $cleanContent)
    Write-Host "SUCCESS: prasang.html repaired"
} else {
    Write-Host "PATTERN NOT FOUND - manual repair needed"
}
