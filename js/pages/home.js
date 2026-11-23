/* Home page sections. */
(function () {
    "use strict";

    var eventsMount = document.getElementById("ksl-home-events");
    if (eventsMount && window.KSL_CONTENT) {
        var today;
        try {
            today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(new Date());
        } catch (e) {
            today = new Date().toISOString().slice(0, 10);
        }
        function day(value) {
            if (window.KSL_EVENTS && window.KSL_EVENTS.calendarDay) return window.KSL_EVENTS.calendarDay(value);
            var match = String(value || "").match(/^(\d{4}-\d{2}-\d{2})/);
            return match ? match[1] : "";
        }
        window.KSL_CONTENT.fetchJson("/api/public/events", "data/events.json").then(function (data) {
            var list = data ? (data.upcoming || []).concat(data.past || []) : [];
            var upcoming = list.filter(function (item) {
                var d = day(item && item.date);
                return d && d >= today;
            }).sort(function (a, b) {
                return day(a.date).localeCompare(day(b.date));
            }).slice(0, 3);
            if (upcoming.length && window.KSL_EVENTS) {
                eventsMount.classList.add("ksl-event-pack-grid");
                eventsMount.innerHTML = upcoming.map(function (item) {
                    return window.KSL_EVENTS.card(item);
                }).join("");
                window.KSL_EVENTS.watch(eventsMount);
            } else if (upcoming.length) {
                eventsMount.innerHTML = '<section class="ksl-empty-state" role="status"><h3>Events are loading</h3><p>Refresh the page in a moment.</p></section>';
            } else {
                eventsMount.innerHTML = '<section class="ksl-empty-state" role="status"><h3>No upcoming events</h3><p>Published events with a date from today onward will appear here.</p><div class="ksl-empty-state-actions"><a class="btn btn-outline-primary" href="news.html?tab=events">Browse events</a></div></section>';
            }
            if (window.KSL_LIVE) window.KSL_LIVE.show(eventsMount);
        }).catch(function () {
            eventsMount.innerHTML = '<section class="ksl-empty-state" role="status"><h3>Events unavailable</h3><p>Could not reach the events list. Try again shortly.</p></section>';
            if (window.KSL_LIVE) window.KSL_LIVE.show(eventsMount);
        });
    }

    var mount = document.getElementById("ksl-home-news-grid");
    if (!mount) {
        return;
    }

    var arrow = '<svg class="ksl-feed-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>';
    var items = [];

    function formatDate(iso) {
        if (window.KSL_CONTENT && window.KSL_CONTENT.formatDisplayDate) {
            return window.KSL_CONTENT.formatDisplayDate(iso);
        }
        try {
            var day = String(iso || "").match(/^(\d{4}-\d{2}-\d{2})/);
            return new Date((day ? day[1] : iso) + (day ? "T12:00:00" : "")).toLocaleDateString("en-KE", {
                year: "numeric",
                month: "long",
                day: "numeric",
            });
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

    function feedCard(item) {
        return (
            '<a class="ksl-feed-card" href="article.html?slug=' + encodeURIComponent(item.slug) + '">' +
            '<span class="ksl-feed-photo"><img src="' + escapeHtml(item.image) + '" alt="" loading="lazy" decoding="async"></span>' +
            '<span class="ksl-feed-body">' +
            '<span class="ksl-feed-top"><span class="ksl-feed-pill">' + escapeHtml(item.category || "News") + "</span>" + arrow + "</span>" +
            '<span class="ksl-feed-name">' + escapeHtml(item.title) + "</span>" +
            '<span class="ksl-feed-meta">' + escapeHtml(formatDate(item.date)) + "</span>" +
            "</span></a>"
        );
    }

    (window.KSL_CONTENT ? window.KSL_CONTENT.fetchJson("/api/public/news", "data/news.json") : fetch("data/news.json").then(function (res) { return res.json(); }))
        .then(function (data) {
            if (!data) {
                if (window.KSL_LIVE) window.KSL_LIVE.show(mount);
                return;
            }
            items = (data.items || []).slice().sort(function (a, b) {
                return String(b.date || "").localeCompare(String(a.date || ""));
            }).slice(0, 3);
            if (!items.length) {
                mount.innerHTML = '<section class="ksl-empty-state" role="status"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"></circle><path d="m15.5 15.5 5 5"></path></svg><h3>News is coming soon</h3><p>There are no published news articles yet.</p><div class="ksl-empty-state-actions"><a class="btn btn-outline-primary" href="contact.html">Contact us</a></div></section>';
                if (window.KSL_LIVE) window.KSL_LIVE.show(mount);
                return;
            }
            mount.innerHTML = items.map(feedCard).join("");
            if (window.KSL_LIVE) window.KSL_LIVE.show(mount);
        })
        .catch(function () {
            mount.innerHTML = '<section class="ksl-empty-state" role="status"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"></circle><path d="m15.5 15.5 5 5"></path></svg><h3>News is unavailable</h3><p>Check your connection, then try again.</p><div class="ksl-empty-state-actions"><a class="btn btn-primary" href="news.html">Open newsroom</a></div></section>';
            if (window.KSL_LIVE) window.KSL_LIVE.show(mount);
        });
})();

(function () {
    var explorer = document.querySelector(".ksl-yard-explorer");
    if (!explorer) return;
    var pins = explorer.querySelectorAll(".ksl-map-pin");
    var counties = explorer.querySelectorAll(".ksl-map-county");
    var details = explorer.querySelectorAll(".ksl-yard-detail");
    var toggles = explorer.querySelectorAll(".ksl-yard-sat-toggle");
    var sat = document.querySelector(".ksl-yard-sat");
    var satFrame = sat && sat.querySelector("iframe");
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    var current = "mombasa";

    function bySite(list, site) {
        return Array.prototype.filter.call(list, function (el) {
            return el.getAttribute("data-site") === site;
        })[0];
    }

    function satOpen() {
        return sat && sat.classList.contains("is-open");
    }

    function syncSat() {
        var toggle = bySite(details, current).querySelector(".ksl-yard-sat-toggle");
        if (satOpen() && satFrame.getAttribute("src") !== toggle.getAttribute("data-embed")) {
            satFrame.setAttribute("src", toggle.getAttribute("data-embed"));
        }
        toggles.forEach(function (btn) {
            btn.setAttribute("aria-expanded", satOpen() ? "true" : "false");
        });
    }

    function showSat(open) {
        if (!sat) return;
        sat.classList.toggle("is-open", open);
        syncSat();
        if (open) {
            setTimeout(function () {
                var box = sat.getBoundingClientRect();
                if (box.bottom > window.innerHeight) {
                    sat.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "end" });
                }
            }, 350);
        }
    }

    function select(site) {
        current = site;
        pins.forEach(function (pin) {
            var on = pin.getAttribute("data-site") === site;
            pin.classList.toggle("is-active", on);
            pin.setAttribute("aria-pressed", on ? "true" : "false");
        });
        counties.forEach(function (county) {
            county.classList.toggle("is-active", county.getAttribute("data-site") === site);
        });
        details.forEach(function (detail) {
            detail.hidden = detail.getAttribute("data-site") !== site;
        });
        syncSat();
    }

    counties.forEach(function (county) {
        county.addEventListener("click", function () {
            select(county.getAttribute("data-site"));
        });
    });

    pins.forEach(function (pin, i) {
        pin.addEventListener("click", function () {
            select(pin.getAttribute("data-site"));
        });
        pin.addEventListener("keydown", function (event) {
            var step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
            if (!step) return;
            event.preventDefault();
            var next = pins[(i + step + pins.length) % pins.length];
            next.focus();
            select(next.getAttribute("data-site"));
        });
    });

    toggles.forEach(function (btn) {
        btn.addEventListener("click", function () { showSat(!satOpen()); });
    });

    if (sat) {
        sat.querySelector(".ksl-yard-sat-close").addEventListener("click", function () {
            showSat(false);
            var btn = bySite(details, current).querySelector(".ksl-yard-sat-toggle");
            if (btn) btn.focus();
        });
    }

    select(current);
})();
