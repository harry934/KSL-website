$root = Split-Path -Parent $PSScriptRoot

$brochure = "https://kenyashipyards.co.ke/wp-content/uploads/2025/04/KSL-Brochure-version-28-NOV-2024.pdf"
$facebook = "https://www.facebook.com/kenyashipyardslimited"

$bodyMap = @{
    "index.html" = 'data-ksl-scripts="core wow parallax counter lightbox" data-ksl-page="home"'
    "downloads.html" = 'data-ksl-scripts="core wow" data-ksl-page="downloads"'
    "news.html" = 'data-ksl-scripts="core wow" data-ksl-page="news"'
    "article.html" = 'data-ksl-scripts="core wow" data-ksl-page="article"'
    "faq.html" = 'data-ksl-scripts="core wow" data-ksl-page="faq"'
    "careers.html" = 'data-ksl-scripts="core wow" data-ksl-page="careers"'
    "organization.html" = 'data-ksl-scripts="core wow" data-ksl-page="organization"'
    "event.html" = 'data-ksl-scripts="core wow" data-ksl-page="event"'
    "project.html" = 'data-ksl-scripts="core wow lightbox"'
    "videos.html" = 'data-ksl-scripts="core wow lightbox"'
    "about.html" = 'data-ksl-scripts="core wow lightbox"'
}

$oldScripts = @'
    <script src="https://code.jquery.com/jquery-3.4.1.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.0.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="lib/wow/wow.min.js"></script>
    <script src="lib/easing/easing.min.js"></script>
    <script src="lib/waypoints/waypoints.min.js"></script>
    <script src="lib/owlcarousel/owl.carousel.min.js"></script>
    <script src="lib/counterup/counterup.min.js"></script>
    <script src="lib/parallax/parallax.min.js"></script>
    <script src="lib/isotope/isotope.pkgd.min.js"></script>
    <script src="lib/lightbox/js/lightbox.min.js"></script>
    <script src="js/access.js"></script>
    <script src="js/lang.js"></script>
    <script src="js/main.js?v=20260332"></script>
    <script src="js/mobile-nav.js?v=20260327"></script>
'@

$newScripts = '    <script src="js/scripts.js?v=20260401"></script>'

Get-ChildItem (Join-Path $root "*.html") | ForEach-Object {
    $name = $_.Name
    $c = Get-Content $_.FullName -Raw
    $c = $c -replace 'http://10\.104\.4\.139', 'https://kenyashipyards.co.ke'
    $c = $c -replace 'href="https://facebook\.com"', ('href="' + $facebook + '"')
    $c = $c -replace '<span class="dropdown-item ksl-dl-pending">Product Catalogue</span>', ('<a class="dropdown-item" href="' + $brochure + '" target="_blank" rel="noopener" title="Product overview (KSL brochure)">Product Catalogue</a>')
    $c = $c -replace 'css/ksl\.css\?v=[^"]+', 'css/ksl.css?v=20260401'
    if ($c -match $oldScripts) {
        $c = $c.Replace($oldScripts, $newScripts)
    } else {
        $c = $c -replace '(?s)<script src="https://code\.jquery\.com/jquery-3\.4\.1\.min\.js"></script>.*?<script src="js/mobile-nav\.js\?v=[^"]+"></script>', $newScripts
    }
    if ($bodyMap.ContainsKey($name)) {
        $c = $c -replace '<body>', ('<body ' + $bodyMap[$name] + '>')
    } else {
        $c = $c -replace '<body>', '<body data-ksl-scripts="core wow">'
    }
    Set-Content $_.FullName -Value $c -NoNewline
}
