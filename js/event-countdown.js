/* Live countdown and event cards for the public site. Times are East Africa Time. */
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

    function calendarDay(value) {
        var text = String(value || "").trim();
        var match = text.match(/^(\d{4}-\d{2}-\d{2})/);
        return match ? match[1] : "";
    }

    function bounds(evt) {
        var date = calendarDay(evt && evt.date);
        if (!date) return null;
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

    function formatDate(iso, opts) {
        try {
            return new Date(calendarDay(iso) + "T12:00:00").toLocaleDateString("en-KE", opts || {
                year: "numeric",
                month: "short",
                day: "numeric"
            });
        } catch (e) {
            return iso || "";
        }
    }

    function formatTime(hhmm) {
        var parts = String(hhmm || "").split(":");
        var h = parseInt(parts[0], 10);
        if (isNaN(h)) return "";
        var suffix = h >= 12 ? "pm" : "am";
        return ((h % 12) || 12) + ":" + (parts[1] || "00") + " " + suffix;
    }

    function timeLabel(evt) {
        if (!evt.timeStart) return "";
        return formatTime(evt.timeStart) + (evt.timeEnd ? " – " + formatTime(evt.timeEnd) : "");
    }

    function safeImage(url) {
        if (window.KSL_CONTENT && window.KSL_CONTENT.safeMediaUrl) {
            return window.KSL_CONTENT.safeMediaUrl(url) || "img/ksl/yard.jpg";
        }
        return url || "img/ksl/yard.jpg";
    }

    var ICONS = {
        calendar: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M8 3.5v3M16 3.5v3M3.5 9.5h17"/></svg>',
        clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
        pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/></svg>',
        arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
    };

    function card(evt) {
        var href = "event.html?slug=" + encodeURIComponent(evt.slug || "");
        var photo = safeImage(evt.image);
        var stand = evt.image ? "" : ' data-ksl-image="content.missing-photo"';
        var when = bounds(evt);
        var info = phase(evt);
        var past = info.state === "ended";
        var venue = String(evt.venue || "").trim();
        var theme = String(evt.theme || "").trim();
        var time = timeLabel(evt);
        var dateText = formatDate(evt.date, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
        var metaBits = [];
        if (dateText) metaBits.push(dateText);
        if (time) metaBits.push(time);

        var facts = "";
        if (venue) {
            facts += '<li>' + ICONS.pin + "<span>Venue</span><strong>" + escapeHtml(venue) + "</strong></li>";
        }
        if (time) {
            facts += '<li>' + ICONS.clock + "<span>Time</span><strong>" + escapeHtml(time) + "</strong></li>";
        }
        if (theme) {
            facts += '<li>' + ICONS.calendar + "<span>Focus</span><strong>" + escapeHtml(theme) + "</strong></li>";
        }

        return (
            '<article class="ksl-event-pack" data-ksl-count data-start="' + (when ? when.start.toISOString() : "") + '" data-end="' + (when ? when.end.toISOString() : "") + '" data-state="' + info.state + '">' +
            '<a class="ksl-event-pack-photo" href="' + href + '" aria-label="' + escapeHtml(evt.title || "Event") + '">' +
            "<img" + stand + ' src="' + escapeHtml(photo) + '" alt="' + escapeHtml(evt.imageAlt || evt.title || "") + '" loading="lazy" decoding="async">' +
            '<span class="ksl-event-pack-badge" data-ksl-badge' + (info.state === "soon" ? "" : " hidden") + ">Starts soon</span>" +
            (past ? '<span class="ksl-event-pack-chip">Past event</span>' : '<span class="ksl-event-pack-chip is-live">Upcoming</span>') +
            "</a>" +
            '<div class="ksl-event-pack-body">' +
            (venue ? '<p class="ksl-event-pack-place">' + escapeHtml(venue) + "</p>" : '<p class="ksl-event-pack-place">Kenya Shipyards</p>') +
            '<h3 class="ksl-event-pack-title"><a href="' + href + '">' + escapeHtml(evt.title || "Event") + "</a></h3>" +
            (metaBits.length
                ? '<p class="ksl-event-pack-meta">' + ICONS.calendar + "<span>" + escapeHtml(metaBits.join(" | ")) + "</span></p>"
                : "") +
            (facts ? '<ul class="ksl-event-pack-facts">' + facts + "</ul>" : "") +
            clockMarkup() +
            '<div class="ksl-event-pack-foot">' +
            '<a class="ksl-event-pack-btn" href="' + href + '"><span>View event</span>' + ICONS.arrow + "</a>" +
            "</div>" +
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
        watch: watch,
        calendarDay: calendarDay
    };
})();
