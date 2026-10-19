/* Organisation page: yards, leaders and the chart. */
(function () {
    "use strict";

    var mount = document.getElementById("ksl-org-extra");
    if (!mount) {
        return;
    }

    function fetchOrg() {
        return window.KSL_CONTENT
            ? window.KSL_CONTENT.fetchJson("/api/public/organization", "data/organization.json")
            : fetch("data/organization.json").then(function (res) { return res.json(); });
    }

    function fetchDownloads() {
        return window.KSL_CONTENT
            ? window.KSL_CONTENT.fetchJson("/api/public/downloads", "data/downloads.json")
            : fetch("data/downloads.json").then(function (res) { return res.json(); });
    }

    Promise.all([fetchOrg(), fetchDownloads()])
        .then(function (pair) {
            var data = pair[0];
            var dl = pair[1];
            if (!data || !dl) {
                return;
            }
            var chartId = data.chartDownloadId;
            var chart = (dl.items || []).find(function (i) { return i.id === chartId; });
            var chartHref = chart ? (chart.href || (dl.baseUrl + chart.file)) : "downloads.html";
            var esc = window.KSL_ESCAPE || function (value) { return String(value == null ? "" : value); };
            var html = '<section class="ksl-org-extra mb-5" aria-label="Leadership">';
            html += '<h2 class="h4 mb-3">Executive leadership</h2><div class="row g-3">';
            (data.leadership || []).forEach(function (row) {
                html += '<div class="col-md-6"><div class="pillar-card p-4 h-100"><h3 class="h6 text-primary">' + esc(row.role) + "</h3><p class=\"mb-0\">" + esc(row.summary) + "</p></div></div>";
            });
            html += '</div><p class="mt-4 mb-0">' + (window.kslDocButton
                ? window.kslDocButton(chartHref, "Strategic Plan")
                : '<a class="btn btn-outline-primary" href="' + chartHref + '" target="_blank" rel="noopener">Download organisation reference (Strategic Plan)</a>') + '</p>';
            html += "</section>";
            mount.innerHTML = html;
        });
})();
