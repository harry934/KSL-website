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

    var SOURCE = "http://10.104.4.139/corporate-documents/";
    var FILE_RE = /\.(pdf|docx?|xlsx?|pptx?|csv|zip)(?:$|[?#])/i;

    function fileUrl(item) {
        return item.href || item.file;
    }

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function absoluteUrl(href) {
        try {
            return new URL(href, SOURCE).href;
        } catch (e) {
            return "";
        }
    }

    function slugify(value) {
        return String(value || "documents").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "documents";
    }

    function headingFor(link) {
        var node = link;
        while (node && node.parentElement) {
            var prev = node.previousElementSibling;
            while (prev) {
                if (/^H[1-3]$/.test(prev.tagName)) {
                    return prev.textContent.replace(/\s+/g, " ").trim();
                }
                var inner = prev.querySelector && prev.querySelector("h1, h2, h3");
                if (inner) {
                    return inner.textContent.replace(/\s+/g, " ").trim();
                }
                prev = prev.previousElementSibling;
            }
            node = node.parentElement;
        }
        return "Corporate documents";
    }

    function documentsFromHtml(html) {
        var doc = new DOMParser().parseFromString(html, "text/html");
        var seen = {};
        var items = [];
        Array.prototype.forEach.call(doc.querySelectorAll("a[href]"), function (link) {
            if (link.closest("nav, header, footer")) {
                return;
            }
            var href = absoluteUrl(link.getAttribute("href"));
            if (!href || seen[href] || !FILE_RE.test(href)) {
                return;
            }
            seen[href] = true;
            var filename = href.split("/").pop().split("?")[0].split("#")[0];
            try {
                filename = decodeURIComponent(filename);
            } catch (e) {
                /* keep raw name */
            }
            var label = (link.textContent || "").replace(/\s+/g, " ").trim();
            if (!label || label.length > 140 || /^https?:/i.test(label)) {
                label = filename.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ");
            }
            var group = headingFor(link) || "Corporate documents";
            items.push({
                title: label,
                category: slugify(group),
                categoryLabel: group,
                language: "",
                date: "",
                type: (filename.split(".").pop() || "file").toUpperCase(),
                href: href,
                filename: filename,
                anchor: slugify(group)
            });
        });
        return items;
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
        function emptyState(title, message, actionHtml) {
            return (
                '<section class="ksl-empty-state" role="status">' +
                '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"></circle><path d="m15.5 15.5 5 5"></path></svg>' +
                "<h3>" + title + "</h3>" +
                "<p>" + message + "</p>" +
                '<div class="ksl-empty-state-actions">' + actionHtml + "</div>" +
                "</section>"
            );
        }

        var visible = items.filter(matches);
        if (!visible.length) {
            var hasQuery = !!query;
            var title = hasQuery ? "No matching documents" : "No documents found";
            var message = hasQuery
                ? "No files match “" + query + "”. Try another keyword or view the full library."
                : "There are no documents in this category yet.";
            var actions = hasQuery
                ? '<button class="btn btn-primary" type="button" data-downloads-clear>Clear search</button><a class="btn btn-outline-primary" href="downloads.html">View all documents</a>'
                : '<a class="btn btn-outline-primary" href="contact.html">Contact us</a>';
            listRoot.innerHTML = emptyState(title, message, actions);
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
            html += '<section class="ksl-library-group" id="' + escapeHtml(key) + '">';
            html += "<h2>" + escapeHtml(group.label) + "</h2>";
            html += '<ul class="ksl-library-list">';
            group.rows.forEach(function (item) {
                var url = fileUrl(item);
                var sub = item.subtitle ? '<p class="text-muted small mb-1">' + escapeHtml(item.subtitle) + "</p>" : "";
                var meta = [item.type, item.language, item.date].filter(Boolean).map(escapeHtml).join(" · ");
                html += "<li><div><h3>" + escapeHtml(item.title) + "</h3>" + sub + "<p>" + escapeHtml(displayFilename(item.filename)) + "</p>";
                html += '<p class="ksl-downloads-meta">' + meta + "</p></div>";
                html += '<a class="download-button" href="' + escapeHtml(url) + '" target="_blank" rel="noopener"><span class="docs">Download</span><span class="download" aria-hidden="true">↓</span></a></li>';
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

    if (listRoot) {
        listRoot.addEventListener("click", function (event) {
            if (!event.target.closest("[data-downloads-clear]") || !searchInput) {
                return;
            }
            searchInput.value = "";
            query = "";
            render(window.__kslDownloadsData);
            searchInput.focus();
        });
    }

    function showLoadError() {
        if (!listRoot) {
            return;
        }
        listRoot.innerHTML = '<iframe class="ksl-documents-frame" title="Corporate documents" src="' + SOURCE + '"></iframe>';
    }

    function publish(found) {
        items = found;
        window.__kslDownloadsData = { source: SOURCE, items: found };
        var cats = [];
        var seen = {};
        found.forEach(function (item) {
            if (!seen[item.category]) {
                seen[item.category] = true;
                cats.push({ id: item.category, label: item.categoryLabel });
            }
        });
        bindFilters(cats);
        render(window.__kslDownloadsData);
    }

    if (listRoot) {
        listRoot.innerHTML = '<p class="ksl-downloads-meta">Loading documents…</p>';
    }

    fetch(SOURCE, { credentials: "omit" })
        .then(function (res) {
            if (!res.ok) {
                throw new Error("status");
            }
            return res.text();
        })
        .then(function (html) {
            var found = documentsFromHtml(html);
            if (!found.length) {
                throw new Error("empty");
            }
            publish(found);
        })
        .catch(showLoadError);
})();
