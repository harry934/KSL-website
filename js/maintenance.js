/* Shows the maintenance page only when the hostname is an IP address
   and Site settings has the switch on. A domain name stays on the website.
   Add ?ksl-maint=1 to preview the page on any address. */
(function () {
    "use strict";

    function isIp(host) {
        var name = String(host || "").replace(/^\[|\]$/g, "");
        if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(name)) return true;
        return name.indexOf(":") !== -1;
    }

    var preview = /(?:\?|&)ksl-maint=1(?:&|$)/.test(window.location.search || "");
    if (!isIp(window.location.hostname) && !preview) return;

    var style = document.createElement("link");
    style.rel = "stylesheet";
    style.href = new URL("css/maintenance.css?v=20261116-3", document.baseURI).href;
    document.head.appendChild(style);

    if (!preview) document.documentElement.classList.add("ksl-maint-hold");

    var root = null;
    var tick = null;
    var endsAt = "";
    var clockEl = null;
    var units = [];
    var opened = false;

    function releaseHold() {
        document.documentElement.classList.remove("ksl-maint-hold");
        if (document.documentElement.classList.contains("ksl-maint-on")) return;
        try {
            document.dispatchEvent(new CustomEvent("ksl-maintenance-clear"));
        } catch (err) {
            /* ignore */
        }
    }

    function apiBase() {
        return (document.documentElement.getAttribute("data-ksl-content-api") || "").trim().replace(/\/$/, "");
    }

    function endsMs(value) {
        var match = String(value || "").trim().match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
        if (!match) return null;
        var ms = Date.parse(match[1] + "T" + match[2] + ":00+03:00");
        return isNaN(ms) ? null : ms;
    }

    function pad(value) {
        return (value < 10 ? "0" : "") + value;
    }

    function paint() {
        var end = endsMs(endsAt);
        if (!units.length || !clockEl) return;
        if (end === null) {
            clockEl.hidden = true;
            return;
        }
        clockEl.hidden = false;
        var left = Math.max(0, Math.floor((end - Date.now()) / 1000));
        var parts = [
            Math.floor(left / 86400),
            Math.floor((left % 86400) / 3600),
            Math.floor((left % 3600) / 60),
            left % 60
        ];
        for (var i = 0; i < units.length; i += 1) units[i].textContent = pad(parts[i]);
        if (left === 0) {
            window.clearInterval(tick);
            tick = null;
            window.setTimeout(openSite, 400);
        }
    }

    function quietIntro() {
        var nodes = document.querySelectorAll(".ksl-intro, .ksl-intro-flight-logo");
        for (var i = 0; i < nodes.length; i += 1) {
            var videos = nodes[i].querySelectorAll("video");
            for (var v = 0; v < videos.length; v += 1) videos[v].pause();
            nodes[i].remove();
        }
        document.documentElement.classList.remove("ksl-intro-pending", "ksl-intro-active", "ksl-intro-handoff");
    }

    function openSite() {
        if (tick) window.clearInterval(tick);
        tick = null;
        if (root) root.remove();
        root = null;
        document.documentElement.classList.remove("ksl-maint-on");
        releaseHold();
    }

    function show(nextEndsAt) {
        endsAt = nextEndsAt || "";
        if (!root) {
            units = [];
            root = document.createElement("div");
            root.className = "ksl-maint";
            root.setAttribute("role", "dialog");
            root.setAttribute("aria-modal", "true");
            root.setAttribute("aria-labelledby", "ksl-maint-title");

            var card = document.createElement("div");
            card.className = "ksl-maint-card";

            var art = document.createElement("img");
            art.className = "ksl-maint-art";
            art.alt = "";
            art.src = new URL("img/ksl/maintenance.svg", document.baseURI).href;

            var title = document.createElement("h1");
            title.id = "ksl-maint-title";
            title.textContent = "Under Maintenance";

            var copy = document.createElement("p");
            copy.className = "ksl-maint-copy";
            copy.textContent = "We're currently performing scheduled maintenance. We should be back shortly. Thank you for your patience.";

            var clock = document.createElement("div");
            clock.className = "ksl-maint-clock";
            clockEl = clock;
            ["Days", "Hours", "Minutes", "Seconds"].forEach(function (label) {
                var unit = document.createElement("div");
                unit.className = "ksl-maint-unit";
                var strong = document.createElement("strong");
                strong.textContent = "00";
                var caption = document.createElement("span");
                caption.textContent = label;
                unit.appendChild(strong);
                unit.appendChild(caption);
                clock.appendChild(unit);
                units.push(strong);
            });

            card.appendChild(art);
            card.appendChild(title);
            card.appendChild(copy);
            card.appendChild(clock);
            root.appendChild(card);
            document.documentElement.appendChild(root);
        }
        document.documentElement.classList.add("ksl-maint-on");
        document.documentElement.classList.remove("ksl-maint-hold");
        quietIntro();
        paint();
        if (!tick) tick = window.setInterval(paint, 1000);
        opened = true;
    }

    function shouldShow(data) {
        if (!data || !data.enabled) return false;
        if (!data.endsAt) return true;
        var end = endsMs(data.endsAt);
        return end !== null && end > Date.now();
    }

    function demoEndsAt() {
        var shifted = new Date(Date.now() + (3 * 60 * 60 * 1000) + (2 * 24 * 60 * 60 * 1000));
        var p = function (n) { return (n < 10 ? "0" : "") + n; };
        return shifted.getUTCFullYear() + "-" + p(shifted.getUTCMonth() + 1) + "-" + p(shifted.getUTCDate()) + "T" + p(shifted.getUTCHours()) + ":" + p(shifted.getUTCMinutes());
    }

    function apply(data) {
        if (shouldShow(data)) {
            show(data.endsAt || "");
            return;
        }
        if (preview && !opened) {
            show(demoEndsAt());
            return;
        }
        if (opened) openSite();
        else releaseHold();
    }

    function load() {
        var base = apiBase();
        if (!base) {
            apply(null);
            return Promise.resolve();
        }
        return fetch(base + "/api/public/maintenance", { cache: "no-store" })
            .then(function (response) { return response.ok ? response.json() : null; })
            .then(apply)
            .catch(function () { apply(null); });
    }

    window.setTimeout(function () {
        if (!opened) releaseHold();
    }, 4000);

    document.addEventListener("DOMContentLoaded", function () {
        if (document.documentElement.classList.contains("ksl-maint-on")) quietIntro();
    });

    load();
})();
