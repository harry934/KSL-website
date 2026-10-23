/* Live countdown for public event cards. Times are East Africa Time. */
(function () {
    "use strict";

    var roots = [];
    var timer = 0;

    function pad(n) {
        return n < 10 ? "0" + n : String(n);
    }

    function escapeHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function clockTime(value, fallback) {
        return /^\d{2}:\d{2}/.test(String(value || "")) ? String(value).slice(0, 5) : fallback;
    }

    function bounds(evt) {
        var date = String((evt && evt.date) || "");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
        var start = new Date(date + "T" + clockTime(evt.timeStart, "00:00") + ":00+03:00");
        var end = evt.timeEnd
            ? new Date(date + "T" + clockTime(evt.timeEnd, "23:59") + ":00+03:00")
            : new Date(date + "T23:59:59+03:00");
        if (isNaN(start.getTime())) return null;
        if (isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
            end = new Date(date + "T23:59:59+03:00");
        }
        return { start: start, end: end };
    }

    function phase(evt, now) {
        var span = bounds(evt);
        var moment = now || new Date();
        if (!span) return { state: "ended", remaining: 0, start: null, end: null };
        if (moment < span.start) {
            var remaining = Math.max(0, Math.floor((span.start.getTime() - moment.getTime()) / 1000));
            return {
                state: remaining < 86400 ? "soon" : "countdown",
                remaining: remaining,
                start: span.start,
                end: span.end
            };
        }
        if (moment.getTime() <= span.end.getTime()) {
            return { state: "live", remaining: 0, start: span.start, end: span.end };
        }
        return { state: "ended", remaining: 0, start: span.start, end: span.end };
    }

    function units(seconds) {
        return {
            days: Math.floor(seconds / 86400),
            hours: Math.floor((seconds % 86400) / 3600),
            minutes: Math.floor((seconds % 3600) / 60),
            seconds: seconds % 60
        };
    }

    function unit(name, label) {
        return '<div><strong data-unit="' + name + '">00</strong><span>' + label + "</span></div>";
    }

    function clockMarkup() {
        return (
            '<div class="ksl-count-clock" data-ksl-clock>' +
            '<p class="ksl-count-label" data-ksl-label>Event starts in</p>' +
            '<div class="ksl-count-units" data-ksl-units>' +
            unit("days", "Days") +
            unit("hours", "Hours") +
            unit("minutes", "Min") +
            unit("seconds", "Sec") +
            "</div>" +
            '<p class="ksl-count-live" data-ksl-live hidden>Happening now</p>' +
            '<p class="ksl-count-ended" data-ksl-ended hidden>This event has ended</p>' +
            "</div>"
        );
    }

    function dateParts(iso) {
        try {
            var parsed = new Date(iso + "T12:00:00");
            if (isNaN(parsed.getTime())) throw new Error("date");
            return {
                day: pad(parsed.getDate()),
                month: parsed.toLocaleDateString("en-KE", { month: "short", year: "numeric" })
            };
        } catch (e) {
            return { day: "", month: iso || "" };
        }
    }

    function card(evt) {
        var href = "event.html?slug=" + encodeURIComponent(evt.slug || "");
        var photo = evt.image || "img/ksl/yard.jpg";
        var stand = evt.image ? "" : ' data-ksl-image="content.missing-photo"';
        var when = bounds(evt);
        var parts = dateParts(evt.date);
        var venue = evt.venue ? '<p class="ksl-count-venue">' + escapeHtml(evt.venue) + "</p>" : "";
        var stamp = parts.day
            ? '<time class="ksl-count-stamp" datetime="' + escapeHtml(evt.date || "") + '"><strong>' + escapeHtml(parts.day) + "</strong><span>" + escapeHtml(parts.month) + "</span></time>"
            : "";
        return (
            '<article class="ksl-count-card" data-ksl-count data-start="' + (when ? when.start.toISOString() : "") + '" data-end="' + (when ? when.end.toISOString() : "") + '">' +
            '<a class="ksl-count-photo" href="' + href + '" aria-label="' + escapeHtml(evt.title || "Event") + '">' +
            "<img" + stand + ' src="' + escapeHtml(photo) + '" alt="" loading="lazy" decoding="async">' +
            stamp +
            '<span class="ksl-count-badge" data-ksl-badge hidden>Starts soon</span>' +
            "</a>" +
            '<div class="ksl-count-body">' +
            '<h3><a href="' + href + '">' + escapeHtml(evt.title || "Event") + "</a></h3>" +
            venue +
            clockMarkup() +
            '<a class="ksl-count-btn" href="' + href + '">Event details</a>' +
            "</div></article>"
        );
    }

    function paint(root) {
        root.querySelectorAll("[data-ksl-count]").forEach(function (node) {
            var start = new Date(node.getAttribute("data-start") || "");
            var end = new Date(node.getAttribute("data-end") || "");
            var now = new Date();
            var state = "ended";
            var remaining = 0;
            if (!isNaN(start.getTime()) && now < start) {
                remaining = Math.max(0, Math.floor((start.getTime() - now.getTime()) / 1000));
                state = remaining < 86400 ? "soon" : "countdown";
            } else if (!isNaN(end.getTime()) && now.getTime() <= end.getTime()) {
                state = "live";
            }
            var showCount = state === "countdown" || state === "soon";
            var badge = node.querySelector("[data-ksl-badge]");
            var label = node.querySelector("[data-ksl-label]");
            var digits = node.querySelector("[data-ksl-units]");
            var live = node.querySelector("[data-ksl-live]");
            var ended = node.querySelector("[data-ksl-ended]");
            if (badge) badge.hidden = state !== "soon";
            if (label) label.hidden = !showCount;
            if (digits) digits.hidden = !showCount;
            if (live) live.hidden = state !== "live";
            if (ended) ended.hidden = state !== "ended";
            if (showCount && digits) {
                var parts = units(remaining);
                ["days", "hours", "minutes", "seconds"].forEach(function (key) {
                    var el = digits.querySelector('[data-unit="' + key + '"]');
                    if (el) el.textContent = pad(parts[key]);
                });
            }
            node.setAttribute("data-state", state);
        });
    }

    function tick() {
        if (document.hidden) return;
        roots = roots.filter(function (root) { return root.isConnected; });
        roots.forEach(paint);
        if (!roots.length && timer) {
            window.clearInterval(timer);
            timer = 0;
        }
    }

    function watch(root) {
        if (!root || roots.indexOf(root) !== -1) {
            if (root) paint(root);
            return;
        }
        roots.push(root);
        paint(root);
        if (!timer) timer = window.setInterval(tick, 1000);
    }

    document.addEventListener("visibilitychange", function () {
        if (!document.hidden) tick();
    });

    window.KSL_EVENTS = {
        phase: phase,
        card: card,
        clockMarkup: clockMarkup,
        watch: watch
    };
})();
