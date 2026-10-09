(function () {
    "use strict";

    var mount = document.getElementById("ksl-org-extra");
    if (!mount) {
        return;
    }

    fetch("data/organization.json")
        .then(function (res) { return res.json(); })
        .then(function (data) {
            return fetch("data/downloads.json")
                .then(function (r) { return r.json(); })
                .then(function (dl) {
                    var chart = (dl.items || []).find(function (i) { return i.id === data.chartDownloadId; });
                    var chartHref = chart ? dl.baseUrl + chart.file : "downloads.html";
                    var html = '<section class="ksl-org-extra mb-5" aria-label="Leadership and yards">';
                    html += '<h2 class="h4 mb-3">Executive and yard leadership</h2><div class="row g-3">';
                    (data.leadership || []).forEach(function (row) {
                        html += '<div class="col-md-6"><div class="pillar-card p-4 h-100"><h3 class="h6 text-primary">' + row.role + "</h3><p class=\"mb-0\">" + row.summary + "</p></div></div>";
                    });
                    html += "</div>";
                    html += '<h2 class="h4 mt-4 mb-3">Shipyard leads</h2><div class="row g-3">';
                    (data.yards || []).forEach(function (yard) {
                        html += '<div class="col-md-6"><div class="pillar-card p-4 h-100"><h3 class="h6">' + yard.name + "</h3><p class=\"small text-muted mb-2\">" + yard.lead + "</p><p class=\"mb-0\">" + yard.summary + "</p></div></div>";
                    });
                    html += '</div><p class="mt-4 mb-0">' + (window.kslDocButton
                        ? window.kslDocButton(chartHref, "Strategic Plan")
                        : '<a class="btn btn-outline-primary" href="' + chartHref + '" target="_blank" rel="noopener">Download organisation reference (Strategic Plan)</a>') + '</p>';
                    html += "</section>";
                    mount.innerHTML = html;
                });
        });
})();
