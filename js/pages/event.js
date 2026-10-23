/* Events list. */
(function () {
    "use strict";

    var page = document.getElementById("ksl-event");
    var main = document.getElementById("ksl-event-main");
    if (!page || !main) {
        return;
    }

    var slug = new URLSearchParams(window.location.search).get("slug");

    function byId(id) {
        return document.getElementById(id);
    }

    function escapeHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function toDate(iso) {
        return new Date(iso + "T12:00:00");
    }

    function formatDate(iso, opts) {
        try {
            return toDate(iso).toLocaleDateString("en-KE", opts || { year: "numeric", month: "long", day: "numeric" });
        } catch (e) {
            return iso;
        }
    }

    function formatTime(hhmm) {
        var parts = String(hhmm || "").split(":");
        var h = parseInt(parts[0], 10);
        if (isNaN(h)) return "";
        var suffix = h >= 12 ? "pm" : "am";
        return ((h % 12) || 12) + ":" + (parts[1] || "00") + " " + suffix;
    }

    function timeRange(evt) {
        if (!evt.timeStart) return "";
        return formatTime(evt.timeStart) + (evt.timeEnd ? " to " + formatTime(evt.timeEnd) : "");
    }

    function todayIso() {
        var now = new Date();
        var pad = function (n) { return n < 10 ? "0" + n : String(n); };
        return now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate());
    }

    function daysUntil(iso) {
        return Math.round((toDate(iso) - toDate(todayIso())) / 86400000);
    }

    function eventHref(evt) {
        return "event.html?slug=" + encodeURIComponent(evt.slug);
    }

    function icsText(value) {
        return String(value || "").replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\n/g, "\\n");
    }

    function toIcal(evt) {
        var day = evt.date.replace(/-/g, "");
        var tz = evt.timezone || "Africa/Nairobi";
        var when = evt.timeStart
            ? ["DTSTART;TZID=" + tz + ":" + day + "T" + evt.timeStart.replace(":", "") + "00",
               "DTEND;TZID=" + tz + ":" + day + "T" + (evt.timeEnd || evt.timeStart).replace(":", "") + "00"]
            : ["DTSTART;VALUE=DATE:" + day];
        return [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//Kenya Shipyards Limited//Events//EN",
            "BEGIN:VEVENT",
            "UID:" + evt.slug + "@kenyashipyards.co.ke"
        ].concat(when, [
            "SUMMARY:" + icsText(evt.title),
            "LOCATION:" + icsText(evt.venue),
            "DESCRIPTION:" + icsText(evt.theme || evt.description || evt.summary),
            "END:VEVENT",
            "END:VCALENDAR"
        ]).join("\r\n");
    }

    function statusText(days) {
        if (days > 1) return "Starts in " + days + " days";
        if (days === 1) return "Starts tomorrow";
        if (days === 0) return "Happening today";
        return "This event has ended";
    }

    function storyCard(evt) {
        var past = daysUntil(evt.date) < 0;
        return (
            '<a class="ksl-story-card" href="' + eventHref(evt) + '">' +
            '<span class="ksl-story-photo"><img' + (evt.image ? "" : ' data-ksl-image="content.missing-photo"') + ' src="' + escapeHtml(evt.image || "img/ksl/yard.jpg") + '" alt="' + escapeHtml(evt.imageAlt || evt.title || "") + '" loading="lazy" decoding="async"></span>' +
            '<span class="ksl-story-body">' +
            '<span class="ksl-story-kicker">' + (past ? "Past event" : "Upcoming") + (evt.venue ? " \u00b7 " + escapeHtml(evt.venue) : "") + "</span>" +
            '<span class="ksl-story-title">' + escapeHtml(evt.title) + "</span>" +
            ((evt.description || evt.summary) ? '<span class="ksl-story-excerpt">' + escapeHtml(evt.description || evt.summary) + "</span>" : "") +
            '<time datetime="' + escapeHtml(evt.date) + '">' + escapeHtml(formatDate(evt.date)) + "</time>" +
            "</span></a>"
        );
    }

    function renderShare(evt) {
        var url = window.location.href;
        var text = evt.title + " | Kenya Shipyards Limited";
        var targets = {
            facebook: "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(url),
            x: "https://x.com/intent/post?url=" + encodeURIComponent(url) + "&text=" + encodeURIComponent(text),
            linkedin: "https://www.linkedin.com/sharing/share-offsite/?url=" + encodeURIComponent(url),
            whatsapp: "https://wa.me/?text=" + encodeURIComponent(text + " " + url)
        };
        document.querySelectorAll(".ksl-article-share a[data-share]").forEach(function (link) {
            link.href = targets[link.getAttribute("data-share")] || "#";
        });
    }

    function render(evt, all) {
        var days = daysUntil(evt.date);
        var past = days < 0;
        var time = timeRange(evt);

        document.title = evt.title + " | Kenya Shipyards Limited";
        var cover = byId("kslEventCover");
        cover.src = evt.image || "img/ksl/yard.jpg";
        if (!evt.image) cover.setAttribute("data-ksl-image", "content.missing-photo");
        cover.alt = evt.title;
        byId("kslEventKicker").textContent = past ? "Past event" : "Upcoming event";
        byId("kslEventTitle").textContent = evt.title;
        byId("kslEventCrumb").textContent = evt.title;
        byId("kslEventDek").textContent = evt.theme || (evt.body ? evt.description || evt.summary || "" : "");
        byId("kslEventWhen").innerHTML =
            '<time datetime="' + escapeHtml(evt.date) + '">' + escapeHtml(formatDate(evt.date, { weekday: "long", year: "numeric", month: "long", day: "numeric" })) + "</time>" +
            (evt.venue ? '<span aria-hidden="true">·</span>' + escapeHtml(evt.venue) : "");

        byId("kslEventDate").innerHTML =
            "<span>" + escapeHtml(formatDate(evt.date, { weekday: "short" })) + "</span>" +
            "<strong>" + escapeHtml(formatDate(evt.date, { day: "2-digit" })) + "</strong>" +
            "<span>" + escapeHtml(formatDate(evt.date, { month: "short", year: "numeric" })) + "</span>";

        var info = window.KSL_EVENTS ? window.KSL_EVENTS.phase(evt) : null;
        var state = info ? info.state : (past ? "ended" : "countdown");
        var status = byId("kslEventStatus");
        status.textContent = state === "live"
            ? "Happening now"
            : state === "ended"
                ? "This event has ended"
                : state === "soon"
                    ? "Starts soon"
                    : statusText(days);
        status.classList.toggle("is-past", state === "ended");
        status.classList.toggle("is-live", state === "live");

        var clock = byId("kslEventClock");
        if (clock && info && info.start && window.KSL_EVENTS) {
            clock.innerHTML =
                '<div class="ksl-count-inline" data-ksl-count data-start="' + info.start.toISOString() + '" data-end="' + info.end.toISOString() + '">' +
                window.KSL_EVENTS.clockMarkup() +
                "</div>";
            window.KSL_EVENTS.watch(clock);
        }

        var icons = {
            time: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
            venue: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/></svg>'
        };
        var facts = "";
        if (time) {
            facts += '<li>' + icons.time + "<span><span class=\"ksl-event-fact-label\">Time</span>" +
                "<strong>" + escapeHtml(time) + "</strong><small>East Africa Time</small></span></li>";
        }
        if (evt.venue) {
            facts += '<li>' + icons.venue + "<span><span class=\"ksl-event-fact-label\">Venue</span>" +
                "<strong>" + escapeHtml(evt.venue) + "</strong>" +
                '<a href="https://www.google.com/maps/search/?api=1&amp;query=' + encodeURIComponent(evt.venue) + '" target="_blank" rel="noopener">Get directions</a></span></li>';
        }
        byId("kslEventFacts").innerHTML = facts;

        var actions = "";
        if (state !== "ended") {
            var ics = URL.createObjectURL(new Blob([toIcal(evt)], { type: "text/calendar;charset=utf-8" }));
            actions += '<a class="ksl-event-btn" href="' + ics + '" download="' + escapeHtml(evt.slug) + '.ics">Add to calendar</a>';
        }
        byId("kslEventActions").innerHTML = actions;

        var body = evt.body || "<p>" + escapeHtml(evt.description || evt.summary || "") + "</p>";
        if (evt.body && window.KSL_SANITIZE) body = window.KSL_SANITIZE(body);
        main.innerHTML =
            '<div class="ksl-article-prose">' + body + "</div>" +
            (past
                ? '<aside class="ksl-article-note"><strong>Photos and coverage.</strong> For photographs or a summary of KSL at this event, contact Public Affairs at <a href="mailto:publicaffairs@kenyashipyards.co.ke?subject=' + encodeURIComponent("Event enquiry: " + evt.title) + '">publicaffairs@kenyashipyards.co.ke</a>.</aside>'
                : '<aside class="ksl-article-note"><strong>Enquiries.</strong> For questions about KSL at this event, contact Public Affairs at <a href="mailto:publicaffairs@kenyashipyards.co.ke?subject=' + encodeURIComponent("Event enquiry: " + evt.title) + '">publicaffairs@kenyashipyards.co.ke</a>.</aside>');

        var others = all.filter(function (other) { return other !== evt; }).slice(0, 3);
        var more = byId("kslEventMore");
        if (others.length) {
            more.innerHTML = others.map(storyCard).join("");
            more.classList.toggle("is-pair", others.length === 2);
            more.classList.toggle("is-single", others.length === 1);
        } else {
            more.closest(".ksl-article-more").hidden = true;
        }

        renderShare(evt);
        page.classList.remove("is-loading");
    }

    function renderNotFound() {
        page.classList.remove("is-loading");
        page.classList.add("is-missing");
        byId("kslEventTitle").textContent = "We couldn't find that event";
        byId("kslEventDek").textContent = "It may have moved or been retired. The events list has everything current.";
        byId("kslEventKicker").textContent = "Events";
        byId("kslEventWhen").textContent = "";
        main.innerHTML = '<p><a class="btn btn-primary" href="news.html?tab=events">Go to Events</a></p>';
        document.querySelector(".ksl-article-aside").hidden = true;
    }

    (window.KSL_CONTENT
        ? window.KSL_CONTENT.fetchJson("/api/public/events", "data/events.json")
        : fetch("data/events.json").then(function (res) {
            if (!res.ok) throw new Error("events");
            return res.json();
        }))
        .then(function (data) {
            var today = (function () {
                try { return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(new Date()); }
                catch (e) { return new Date().toISOString().slice(0, 10); }
            })();
            var all = (data.upcoming || []).concat(data.past || []).filter(function (item) {
                return String(item.date || "") >= today;
            }).sort(function (a, b) {
                return String(b.date || "").localeCompare(String(a.date || ""));
            });
            var evt = slug ? all.filter(function (e) { return e.slug === slug; })[0] : all[0];
            if (evt && String(evt.date || "") >= today) {
                render(evt, all);
            } else {
                renderNotFound();
            }
        })
        .catch(renderNotFound);

    var copyBtn = document.querySelector('.ksl-article-share [data-share="copy"]');
    var copied = document.querySelector(".ksl-article-copied");
    if (copyBtn) {
        copyBtn.addEventListener("click", function () {
            var done = function () {
                copied.textContent = "Link copied";
                copyBtn.classList.add("is-done");
                window.setTimeout(function () {
                    copied.textContent = "";
                    copyBtn.classList.remove("is-done");
                }, 2200);
            };
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(window.location.href).then(done, function () {
                    window.prompt("Copy this link", window.location.href);
                });
            } else {
                window.prompt("Copy this link", window.location.href);
            }
        });
    }
})();
