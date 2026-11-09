/* Corporate documents visitors can download. */
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

    function fileUrl(item) {
        return item.href || item.file;
    }

    function docButton(url) {
        if (window.kslDocButton) {
            return window.kslDocButton(url, "Download");
        }
        var safe = escapeHtml(url);
        return (
            '<a class="download-button" href="' + safe + '" target="_blank" rel="noopener">' +
            '<span class="docs"><svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>Download</span>' +
            '<span class="download"><svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg></span></a>'
        );
    }

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function text(node) {
        return node ? node.textContent.replace(/\s+/g, " ").trim() : "";
    }

    function documentsFromPage() {
        var found = [];
        Array.prototype.forEach.call(listRoot.querySelectorAll(".ksl-library-group"), function (section) {
            var group = text(section.querySelector("h2")) || "Corporate documents";
            var anchor = section.id || group.toLowerCase().replace(/[^a-z0-9]+/g, "-");
            Array.prototype.forEach.call(section.querySelectorAll(".ksl-library-list > li"), function (row) {
                var link = row.querySelector("a.download-button");
                var href = link ? link.getAttribute("href") : "";
                var filename = href ? href.split("/").pop() : "";
                found.push({
                    title: text(row.querySelector("h3")),
                    category: anchor,
                    categoryLabel: group,
                    language: "",
                    date: "",
                    type: filename ? (filename.split(".").pop() || "file").toUpperCase() : "",
                    href: href,
                    filename: filename,
                    note: link ? "" : text(row.querySelector("p")),
                    anchor: anchor
                });
            });
        });
        return found;
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
                if (!url) {
                    html += "<li><div><h3>" + escapeHtml(item.title) + "</h3><p>" + escapeHtml(item.note) + "</p></div>";
                    html += '<span class="ksl-library-note">Not available</span></li>';
                } else {
                    var sub = item.subtitle ? '<p class="text-muted small mb-1">' + escapeHtml(item.subtitle) + "</p>" : "";
                    var meta = [item.type, item.size, item.language, item.date].filter(Boolean).map(escapeHtml).join(" · ");
                    html += "<li><div><h3>" + escapeHtml(item.title) + "</h3>" + sub + "<p>" + escapeHtml(displayFilename(item.filename)) + "</p>";
                    html += '<p class="ksl-downloads-meta">' + meta + "</p></div>";
                    html += docButton(url) + "</li>";
                }
                if (item.id === "charter-sw" || /kiswahili/i.test(item.title || "") && /charter/i.test(item.title || "")) {
                    html +=
                        '<li class="ksl-charter-video-item">' +
                        '<div class="ksl-charter-video">' +
                        '<div class="ksl-charter-video-copy">' +
                        '<p class="ksl-charter-video-kicker">Video</p>' +
                        "<h3>Citizen Service Delivery Charter (Kiswahili)</h3>" +
                        "</div>" +
                        '<div class="ksl-charter-video-frame">' +
                        '<iframe src="https://www.youtube.com/embed/e8BYWZH2h5g" title="Citizen Service Delivery Charter (Kiswahili)" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>' +
                        "</div></div></li>";
                }
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

    function publish(found) {
        items = found;
        window.__kslDownloadsData = { items: found };
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
        if (window.KSL_LIVE) window.KSL_LIVE.show("[data-ksl-await='page']");
    }

    function itemsFromJson(data) {
        var base = data.baseUrl || "";
        return (data.items || []).map(function (item) {
            var href = item.href || (item.file ? base + item.file : "");
            return {
                title: item.title,
                subtitle: item.subtitle,
                category: item.category,
                categoryLabel: item.categoryLabel,
                language: item.language,
                date: item.date,
                type: item.type,
                href: href,
                filename: item.filename || item.file || "",
                note: "",
                anchor: item.anchor || item.category
            };
        });
    }

    function loadDocuments() {
        if (!listRoot) {
            return;
        }
        var fallback = function () {
            publish(documentsFromPage());
        };
        (window.KSL_CONTENT
            ? window.KSL_CONTENT.fetchJson("/api/public/downloads", "data/downloads.json")
            : fetch("data/downloads.json").then(function (res) { return res.json(); }))
            .then(function (data) {
                if (!data || !data.items || !data.items.length) {
                    fallback();
                    return;
                }
                publish(itemsFromJson(data));
            })
            .catch(function () {
                if (!items.length) fallback();
            });
    }

    loadDocuments();
})();
