(function () {
    "use strict";

    var root = document.getElementById("ksl-downloads-app");
    if (!root) {
        return;
    }

    var searchInput = document.getElementById("ksl-downloads-search");
    var filterRoot = document.getElementById("ksl-downloads-filters");
    var listRoot = document.getElementById("ksl-downloads-list");
    var items = [];
    var activeCategory = "all";
    var query = "";

    function fileUrl(item, data) {
        return data.baseUrl + item.file;
    }

    function displayFilename(name) {
        return String(name || "").replace(/-/g, " ");
    }

    function matches(item) {
        if (activeCategory !== "all" && item.category !== activeCategory) {
            return false;
        }
        if (!query) {
            return true;
        }
        var hay = (item.title + " " + item.categoryLabel + " " + item.language + " " + item.filename).toLowerCase();
        return hay.indexOf(query) !== -1;
    }

    function render(data) {
        if (!listRoot) {
            return;
        }
        var visible = items.filter(matches);
        if (!visible.length) {
            listRoot.innerHTML = '<p class="ksl-downloads-empty mb-0">No documents match your search.</p>';
            return;
        }
        var byAnchor = {};
        visible.forEach(function (item) {
            var key = item.anchor || item.category;
            if (!byAnchor[key]) {
                byAnchor[key] = { label: item.categoryLabel, rows: [] };
            }
            byAnchor[key].rows.push(item);
        });
        var html = "";
        Object.keys(byAnchor).forEach(function (key) {
            var group = byAnchor[key];
            html += '<section class="ksl-library-group" id="' + key + '">';
            html += "<h2>" + group.label + "</h2>";
            html += '<ul class="ksl-library-list">';
            group.rows.forEach(function (item) {
                var url = fileUrl(item, data);
                var sub = item.subtitle ? '<p class="text-muted small mb-1">' + item.subtitle + "</p>" : "";
                html += "<li><div><h3>" + item.title + "</h3>" + sub + "<p>" + displayFilename(item.filename) + "</p>";
                html += '<p class="ksl-downloads-meta"><span>' + item.type + "</span> · <span>" + item.language + "</span> · <span>" + item.date + "</span></p></div>";
                html += '<a class="download-button" href="' + url + '" target="_blank" rel="noopener"><span class="docs">Download</span><span class="download" aria-hidden="true">↓</span></a></li>';
            });
            html += "</ul></section>";
        });
        listRoot.innerHTML = html;
    }

    function bindFilters(categories) {
        if (!filterRoot) {
            return;
        }
        filterRoot.innerHTML = "";
        var allBtn = document.createElement("button");
        allBtn.type = "button";
        allBtn.className = "is-active";
        allBtn.textContent = "All";
        allBtn.setAttribute("data-ksl-dl-filter", "all");
        filterRoot.appendChild(allBtn);
        categories.forEach(function (cat) {
            var btn = document.createElement("button");
            btn.type = "button";
            btn.textContent = cat.label;
            btn.setAttribute("data-ksl-dl-filter", cat.id);
            filterRoot.appendChild(btn);
        });
        filterRoot.addEventListener("click", function (event) {
            var btn = event.target.closest("[data-ksl-dl-filter]");
            if (!btn) {
                return;
            }
            filterRoot.querySelectorAll("button").forEach(function (b) { b.classList.remove("is-active"); });
            btn.classList.add("is-active");
            activeCategory = btn.getAttribute("data-ksl-dl-filter") || "all";
            render(window.__kslDownloadsData);
        });
    }

    if (searchInput) {
        searchInput.addEventListener("input", function () {
            query = searchInput.value.trim().toLowerCase();
            render(window.__kslDownloadsData);
        });
    }

    fetch("data/downloads.json")
        .then(function (res) { return res.json(); })
        .then(function (data) {
            window.__kslDownloadsData = data;
            items = data.items || [];
            var cats = [];
            var seen = {};
            items.forEach(function (item) {
                if (!seen[item.category]) {
                    seen[item.category] = true;
                    cats.push({ id: item.category, label: item.categoryLabel });
                }
            });
            bindFilters(cats);
            render(data);
        })
        .catch(function () {
            listRoot.innerHTML = '<p class="ksl-downloads-empty mb-0">Could not load documents. Please refresh the page.</p>';
        });
})();
