(function () {
    "use strict";

    function formatDate(iso) {
        try {
            return new Date(iso + "T12:00:00").toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" });
        } catch (e) {
            return iso;
        }
    }

    function escapeHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function card(item) {
        var href = "article.html?slug=" + encodeURIComponent(item.slug);
        return (
            '<article class="news-card news-row ksl-lift-card mb-4">' +
            '<a class="news-cover" href="' + href + '"><img src="' + escapeHtml(item.image) + '" alt="" loading="lazy" decoding="async"></a>' +
            '<div class="news-card-body">' +
            '<p class="news-kicker">' + escapeHtml(item.category) + "</p>" +
            "<h3><a href=\"" + href + "\">" + escapeHtml(item.title) + "</a></h3>" +
            '<p class="news-meta">' + escapeHtml(formatDate(item.date)) + " · " + escapeHtml(item.author) + "</p>" +
            "<p>" + escapeHtml(item.excerpt) + "</p>" +
            '<a class="btn btn-outline-gold" href="' + href + '">Read article</a>' +
            "</div></article>"
        );
    }

    var grid = document.getElementById("ksl-news-grid");
    if (grid) {
        var params = new URLSearchParams(window.location.search);
        var query = (params.get("s") || "").trim();
        var needle = query.toLocaleLowerCase("en");
        var summary = document.getElementById("searchNote");
        var heading = document.getElementById("ksl-news-heading");

        function emptyState(title, message, actionHtml, searchValue) {
            var refine = searchValue
                ? '<form class="ksl-empty-search" action="news.html" method="get">' +
                    '<label for="kslEmptySearch">Try another search</label>' +
                    '<div><input id="kslEmptySearch" name="s" type="search" value="' + escapeHtml(searchValue) + '" required>' +
                    '<button class="btn btn-primary" type="submit">Search</button></div></form>'
                : "";
            return (
                '<section class="ksl-empty-state" role="status">' +
                '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"></circle><path d="m15.5 15.5 5 5"></path></svg>' +
                "<h3>" + escapeHtml(title) + "</h3>" +
                "<p>" + escapeHtml(message) + "</p>" +
                refine +
                '<div class="ksl-empty-state-actions">' + actionHtml + "</div>" +
                "</section>"
            );
        }

        function matchesQuery(item) {
            if (!needle) {
                return true;
            }
            return [
                item.title,
                item.category,
                item.excerpt,
                item.author
            ].some(function (value) {
                return String(value || "").toLocaleLowerCase("en").indexOf(needle) !== -1;
            });
        }

        function renderNews(items) {
            var filtered = items.filter(matchesQuery);
            if (heading) {
                heading.textContent = query ? "Search results" : "Latest news";
            }

            if (summary) {
                summary.classList.add("ksl-search-summary");
                summary.classList.remove("is-error");
                if (query) {
                    summary.innerHTML = "<strong>" + filtered.length + "</strong> " + (filtered.length === 1 ? "result" : "results") + " for <q>" + escapeHtml(query) + "</q>. <a href=\"news.html\">Clear search</a>";
                } else {
                    summary.textContent = "Showing " + items.length + (items.length === 1 ? " latest news article." : " latest news articles.");
                }
            }

            if (!items.length) {
                grid.innerHTML = emptyState(
                    "News is coming soon",
                    "There are no published news articles yet.",
                    '<a class="btn btn-outline-primary" href="contact.html">Contact us</a>'
                );
                return;
            }

            if (!filtered.length) {
                grid.innerHTML = emptyState(
                    "No matching news",
                    "Nothing in the newsroom matches that search. Try a shorter word, or browse every article.",
                    '<a class="btn btn-outline-primary" href="news.html">View all news</a>',
                    query
                );
                if (summary) {
                    summary.innerHTML = "<strong>0</strong> results for <q>" + escapeHtml(query) + "</q>. <a href=\"news.html\">Clear search</a>";
                }
                return;
            }

            grid.innerHTML = filtered.map(card).join("");
        }

        function loadNews() {
            grid.setAttribute("aria-busy", "true");
            grid.innerHTML = '<p class="ksl-search-loading"><span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Loading news…</p>';
            fetch("data/news.json")
                .then(function (res) {
                    if (!res.ok) {
                        throw new Error("News request failed with status " + res.status);
                    }
                    return res.json();
                })
                .then(function (data) {
                    renderNews(Array.isArray(data.items) ? data.items : []);
                })
                .catch(function () {
                    if (summary) {
                        summary.textContent = "News is temporarily unavailable.";
                        summary.classList.add("ksl-search-summary", "is-error");
                    }
                    grid.innerHTML = emptyState(
                        "We could not load the news",
                        "Check your connection, then try again.",
                        '<button class="btn btn-primary" type="button" data-news-retry>Try again</button>'
                    );
                })
                .finally(function () {
                    grid.removeAttribute("aria-busy");
                });
        }

        grid.addEventListener("click", function (event) {
            if (event.target.closest("[data-news-retry]")) {
                loadNews();
            }
        });
        loadNews();
    }

    var press = document.getElementById("ksl-press-kit");
    if (press) {
        fetch("data/press.json")
            .then(function (res) { return res.json(); })
            .then(function (data) {
                fetch("data/downloads.json")
                    .then(function (r) { return r.json(); })
                    .then(function (dl) {
                        var links = (data.assets || []).map(function (asset) {
                            var href = asset.href;
                            if (asset.downloadId) {
                                var item = (dl.items || []).find(function (i) { return i.id === asset.downloadId; });
                                if (item) {
                                    href = dl.baseUrl + item.file;
                                }
                            }
                            return '<li><a href="' + href + '" target="_blank" rel="noopener">' + asset.title + '</a> <span class="text-muted">(' + asset.type + ')</span></li>';
                        }).join("");
                        press.innerHTML =
                            "<p>" + data.boilerplate + "</p>" +
                            "<p><strong>Media contact:</strong> <a href=\"mailto:" + data.contactEmail + "\">" + data.contactEmail + "</a> · " + data.contactPhone + "</p>" +
                            "<h3 class=\"h5 mt-4\">Press assets</h3><ul class=\"ksl-press-list\">" + links + "</ul>";
                    });
            });
    }
})();
