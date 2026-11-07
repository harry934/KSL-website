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

    function paintStructure(data, esc) {
        if (!data || !data.chart) return;
        var intro = document.querySelector(".org-intro");
        var chartEl = document.querySelector(".org-chart");
        if (intro && data.intro) {
            intro.innerHTML =
                '<p class="org-kicker">' + esc(data.intro.kicker) + "</p>" +
                '<h2 id="organization-title">' + esc(data.intro.title) + "</h2>" +
                "<p>" + esc(data.intro.body) + "</p>";
        }
        if (!chartEl) return;
        var chart = data.chart;
        var departments = chart.departments || [];
        var html = '<div class="org-tree">' +
            '<div class="org-tree-top" role="list">' +
            '<div class="org-node org-node-board" role="listitem"><span>' + esc(chart.boardCaption) + "</span><strong>" + esc(chart.boardTitle) + "</strong></div>" +
            '<span class="org-connector" aria-hidden="true"></span>' +
            '<div class="org-node org-node-md" role="listitem"><span>' + esc(chart.executiveCaption) + "</span><strong>" + esc(chart.executiveTitle) + "</strong></div>" +
            "</div>" +
            '<div class="org-tier">' +
            '<p class="org-tier-label">Directorates &amp; offices</p>' +
            '<div class="org-tree-branches">';
        departments.forEach(function (dept) {
            html += '<article class="org-branch' + (dept.office ? " is-staff" : "") + '">' +
                '<div class="org-office"><h3>' + esc(dept.title) + "</h3></div>";
            if (dept.units && dept.units.length) {
                html += '<ul class="org-divisions">' + dept.units.map(function (unit) {
                    return "<li>" + esc(unit) + "</li>";
                }).join("") + "</ul>";
            }
            html += "</article>";
        });
        html += "</div></div></div>";
        chartEl.innerHTML = html;
    }

    Promise.all([fetchOrg(), fetchDownloads()])
        .then(function (pair) {
            var data = pair[0];
            var dl = pair[1];
            var esc = window.KSL_ESCAPE || function (value) { return String(value == null ? "" : value); };
            if (data) paintStructure(data, esc);
            if (!data || !dl) {
                return;
            }
            var chartId = data.chartDownloadId;
            var chart = (dl.items || []).find(function (i) { return i.id === chartId; });
            var chartHrefRaw = chart ? (chart.href || (dl.baseUrl + chart.file)) : "downloads.html";
            var chartHref = (window.KSL_SAFE_LINK && window.KSL_SAFE_LINK(chartHrefRaw)) || "downloads.html";
            var html = '<section class="ksl-org-extra mb-5" aria-label="Leadership">';
            html += '<h2 class="h4 mb-3">Executive leadership</h2><div class="row g-3">';
            (data.leadership || []).forEach(function (row) {
                html += '<div class="col-md-6"><div class="pillar-card p-4 h-100"><h3 class="h6 text-primary">' + esc(row.role) + "</h3><p class=\"mb-0\">" + esc(row.summary) + "</p></div></div>";
            });
            html += '</div><p class="mt-4 mb-0">' + (window.kslDocButton
                ? window.kslDocButton(chartHref, "Strategic Plan")
                : '<a class="btn btn-outline-primary" href="' + esc(chartHref) + '" target="_blank" rel="noopener">Download organisation reference (Strategic Plan)</a>') + '</p>';
            html += "</section>";
            mount.innerHTML = html;
        }).then(function () {
            if (window.KSL_LIVE) window.KSL_LIVE.show("[data-ksl-await='page']");
        }, function () {
            if (window.KSL_LIVE) window.KSL_LIVE.show("[data-ksl-await='page']");
        });
})();
