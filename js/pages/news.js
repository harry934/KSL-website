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

    var PAGE_SIZE = 6;
    var arrow = '<svg class="ksl-feed-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>';

    function feedCard(item) {
        return (
            '<button type="button" class="ksl-feed-card" data-ksl-slug="' + escapeHtml(item.slug) + '">' +
            '<span class="ksl-feed-photo"><img src="' + escapeHtml(item.image) + '" alt="" loading="lazy" decoding="async"></span>' +
            '<span class="ksl-feed-body">' +
            '<span class="ksl-feed-top"><span class="ksl-feed-pill">' + escapeHtml(item.label) + "</span>" + arrow + "</span>" +
            '<span class="ksl-feed-name">' + escapeHtml(item.title) + "</span>" +
            '<span class="ksl-feed-meta">' + escapeHtml(item.meta) + "</span>" +
            "</span></button>"
        );
    }

    function sortByDate(list) {
        return list.slice().sort(function (a, b) {
            return String(b.sortDate || "").localeCompare(String(a.sortDate || ""));
        });
    }

    var grid = document.getElementById("ksl-news-grid");
    if (grid) {
        var params = new URLSearchParams(window.location.search);
        var query = (params.get("s") || "").trim();
        var needle = query.toLocaleLowerCase("en");
        var summary = document.getElementById("searchNote");
        var heading = document.getElementById("ksl-news-heading");
        var pages = document.getElementById("ksl-feed-pages");
        var tabNews = document.getElementById("ksl-tab-news");
        var tabEvents = document.getElementById("ksl-tab-events");
        var activeTab = (params.get("tab") || (window.location.hash === "#events" ? "events" : "news")) === "events" ? "events" : "news";
        var page = Math.max(1, parseInt(params.get("page") || "1", 10) || 1);
        var collections = { news: [], events: [] };

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
            return [item.title, item.label, item.meta, item.excerpt].some(function (value) {
                return String(value || "").toLocaleLowerCase("en").indexOf(needle) !== -1;
            });
        }

        function newsItem(item) {
            return {
                slug: item.slug,
                href: "article.html?slug=" + encodeURIComponent(item.slug),
                image: item.image || "img/ksl/yard.jpg",
                label: item.category || "News",
                title: item.title,
                meta: formatDate(item.date),
                sortDate: item.date || "",
                excerpt: item.excerpt || "",
                body: item.body || "",
                moreLabel: "Read the full article",
                facts: [item.author ? "By " + item.author : ""].filter(Boolean)
            };
        }

        function eventItem(item, upcoming) {
            var when = item.date ? formatDate(item.date) : "";
            var time = item.timeStart ? item.timeStart + (item.timeEnd ? " to " + item.timeEnd : "") : "";
            if (time) when += (when ? " · " : "") + item.timeStart;
            if (item.venue) when += (when ? " · " : "") + item.venue;
            return {
                slug: item.slug,
                href: item.href || "event.html",
                image: item.image || "img/ksl/yard.jpg",
                label: upcoming ? "Event" : "Past event",
                title: item.title,
                meta: when || item.summary || "",
                sortDate: item.date || "",
                excerpt: item.description || item.summary || item.theme || "",
                body: "",
                moreLabel: "View the event page",
                facts: [item.theme ? "Theme: " + item.theme : "", time ? "Time: " + time : "", item.venue ? "Venue: " + item.venue : ""].filter(Boolean)
            };
        }

        function setTabState() {
            if (tabNews) tabNews.setAttribute("aria-selected", activeTab === "news" ? "true" : "false");
            if (tabEvents) tabEvents.setAttribute("aria-selected", activeTab === "events" ? "true" : "false");
            if (heading) heading.textContent = activeTab === "events" ? "Latest events" : "Latest news";
        }

        function pageHref(nextPage) {
            var next = new URLSearchParams();
            if (query) next.set("s", query);
            if (activeTab === "events") next.set("tab", "events");
            if (nextPage > 1) next.set("page", String(nextPage));
            var text = next.toString();
            return "news.html" + (text ? "?" + text : "");
        }

        function renderPages(count) {
            if (!pages) return;
            var total = Math.max(1, Math.ceil(count / PAGE_SIZE));
            if (page > total) page = total;
            if (total < 2) {
                pages.innerHTML = "";
                return;
            }
            var html = "";
            for (var i = 1; i <= total; i += 1) {
                html += '<a href="' + pageHref(i) + '"' + (i === page ? ' aria-current="page"' : "") + ">" + i + "</a>";
            }
            pages.innerHTML = html;
        }

        function renderActive() {
            var source = collections[activeTab] || [];
            var filtered = source.filter(matchesQuery);
            setTabState();
            if (summary) {
                summary.classList.add("ksl-search-summary");
                summary.classList.remove("is-error");
                var noun = activeTab === "events" ? "event" : "article";
                if (query) {
                    summary.innerHTML = "<strong>" + filtered.length + "</strong> " + (filtered.length === 1 ? noun : noun + "s") + " for <q>" + escapeHtml(query) + "</q>. <a href=\"news.html" + (activeTab === "events" ? "?tab=events" : "") + "\">Clear search</a>";
                } else if (filtered.length) {
                    summary.textContent = "";
                } else {
                    summary.textContent = "";
                }
            }

            if (!source.length) {
                if (pages) pages.innerHTML = "";
                grid.innerHTML = emptyState(
                    activeTab === "events" ? "Events are coming soon" : "News is coming soon",
                    activeTab === "events" ? "There are no listed events yet." : "There are no published news articles yet.",
                    '<a class="btn btn-outline-primary" href="contact.html">Contact us</a>'
                );
                return;
            }

            if (!filtered.length) {
                if (pages) pages.innerHTML = "";
                grid.innerHTML = emptyState(
                    activeTab === "events" ? "No matching events" : "No matching news",
                    "Nothing matches that search. Try a shorter word, or browse the full list.",
                    '<a class="btn btn-outline-primary" href="news.html' + (activeTab === "events" ? "?tab=events" : "") + '">View all</a>',
                    query
                );
                return;
            }

            var start = (page - 1) * PAGE_SIZE;
            grid.innerHTML = filtered.slice(start, start + PAGE_SIZE).map(feedCard).join("");
            renderPages(filtered.length);
        }

        function loadNews() {
            grid.setAttribute("aria-busy", "true");
            grid.innerHTML = '<p class="ksl-search-loading"><span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Loading news…</p>';
            Promise.all([
                fetch("data/news.json").then(function (res) {
                    if (!res.ok) throw new Error("news");
                    return res.json();
                }),
                fetch("data/events.json").then(function (res) {
                    if (!res.ok) throw new Error("events");
                    return res.json();
                })
            ]).then(function (pair) {
                var news = pair[0];
                var events = pair[1];
                collections.news = sortByDate((Array.isArray(news.items) ? news.items : []).map(newsItem));
                collections.events = sortByDate((events.upcoming || []).map(function (item) {
                    return eventItem(item, true);
                })).concat(sortByDate((events.past || []).map(function (item) {
                    return eventItem(item, false);
                })));
                renderActive();
            }).catch(function () {
                if (summary) {
                    summary.textContent = "News and events are temporarily unavailable.";
                    summary.classList.add("ksl-search-summary", "is-error");
                }
                grid.innerHTML = emptyState(
                    "We could not load this list",
                    "Check your connection, then try again.",
                    '<button class="btn btn-primary" type="button" data-news-retry>Try again</button>'
                );
            }).finally(function () {
                grid.removeAttribute("aria-busy");
            });
        }

        function selectTab(name) {
            activeTab = name;
            page = 1;
            if (window.history && window.history.replaceState) {
                window.history.replaceState(null, "", pageHref(1));
            }
            renderActive();
        }

        if (tabNews) tabNews.addEventListener("click", function () { selectTab("news"); });
        if (tabEvents) tabEvents.addEventListener("click", function () { selectTab("events"); });

        var modal = document.createElement("div");
        modal.className = "ksl-feed-modal";
        modal.id = "kslFeedModal";
        modal.hidden = true;
        modal.innerHTML =
            '<div class="ksl-feed-modal-backdrop" data-feed-close></div>' +
            '<div class="ksl-feed-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="kslFeedModalTitle">' +
            '<button type="button" class="ksl-feed-modal-close" data-feed-close aria-label="Close">&times;</button>' +
            '<div class="ksl-feed-modal-photo"><img alt=""></div>' +
            '<div class="ksl-feed-modal-copy">' +
            '<p class="ksl-feed-pill" id="kslFeedModalLabel"></p>' +
            '<h2 id="kslFeedModalTitle"></h2>' +
            '<p class="ksl-feed-modal-meta"></p>' +
            '<div class="ksl-feed-modal-body"></div>' +
            '<a class="btn btn-primary" id="kslFeedModalMore" href="#">Read more</a>' +
            "</div></div>";
        (document.getElementById("ksl-page") || document.body).appendChild(modal);

        var lastCard = null;

        function findItem(slug) {
            var source = collections[activeTab] || [];
            for (var i = 0; i < source.length; i += 1) {
                if (source[i].slug === slug) return source[i];
            }
            return null;
        }

        function detailHtml(item) {
            var html = "";
            if (item.facts && item.facts.length) {
                html += '<ul class="ksl-feed-modal-facts">' + item.facts.map(function (fact) {
                    return "<li>" + escapeHtml(fact) + "</li>";
                }).join("") + "</ul>";
            }
            if (item.body) {
                html += '<div class="ksl-feed-modal-article">' + item.body + "</div>";
            } else if (item.excerpt) {
                html += "<p>" + escapeHtml(item.excerpt) + "</p>";
            }
            return html;
        }

        function closeFeed() {
            if (modal.hidden) return;
            modal.classList.remove("is-open");
            modal.hidden = true;
            document.documentElement.style.overflow = "";
            if (lastCard && lastCard.focus) lastCard.focus();
        }

        function openFeed(item, card) {
            if (!item) return;
            lastCard = card || null;
            modal.querySelector(".ksl-feed-modal-photo img").src = item.image;
            modal.querySelector("#kslFeedModalLabel").textContent = item.label;
            modal.querySelector("#kslFeedModalTitle").textContent = item.title;
            modal.querySelector(".ksl-feed-modal-meta").textContent = item.meta;
            modal.querySelector(".ksl-feed-modal-body").innerHTML = detailHtml(item);
            var more = modal.querySelector("#kslFeedModalMore");
            more.href = item.href;
            more.textContent = item.moreLabel;
            modal.hidden = false;
            document.documentElement.style.overflow = "hidden";
            window.requestAnimationFrame(function () {
                modal.classList.add("is-open");
            });
            var closeBtn = modal.querySelector(".ksl-feed-modal-close");
            if (closeBtn) closeBtn.focus();
        }

        modal.addEventListener("click", function (event) {
            if (event.target.closest("[data-feed-close]")) closeFeed();
        });
        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") closeFeed();
        });

        grid.addEventListener("click", function (event) {
            if (event.target.closest("[data-news-retry]")) {
                loadNews();
                return;
            }
            var card = event.target.closest(".ksl-feed-card");
            if (!card) return;
            openFeed(findItem(card.getAttribute("data-ksl-slug")), card);
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
