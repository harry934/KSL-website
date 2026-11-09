/* Loads the shared scripts, then the script that belongs to this page. */
(function () {
    "use strict";

    var ASSET_V = "20261109-projyard";

    var BUNDLES = {
        wow: [
            "lib/wow/wow.min.js",
            "lib/easing/easing.min.js",
            "lib/waypoints/waypoints.min.js"
        ],
        counter: ["lib/counterup/counterup.min.js"],
        parallax: ["lib/parallax/parallax.min.js"],
        lightbox: ["lib/lightbox/js/lightbox.min.js"]
    };

    var CORE = [
        "lib/vendor/jquery-3.7.1.min.js",
        "lib/vendor/bootstrap.bundle.min.js"
    ];

    var TAIL = [
        "js/input-guard.js",
        "js/sanitize.js",
        "js/ksl-content.js",
        "js/site-images.js",
        "js/site-settings.js",
        "js/access.js",
        "js/lang.js",
        "js/doodles.js",
        "js/main.js?v=" + ASSET_V,
        "js/mobile-nav.js?v=" + ASSET_V
    ];

    function withV(path) {
        if (path.indexOf("http") === 0 || path.indexOf("?") !== -1) {
            return path;
        }
        return path + "?v=" + ASSET_V;
    }

    function loadScript(src) {
        return new Promise(function (resolve, reject) {
            var s = document.createElement("script");
            s.src = withV(src);
            s.async = false;
            s.onload = function () { resolve(); };
            s.onerror = function () { reject(new Error("Failed to load " + src)); };
            document.body.appendChild(s);
        });
    }

    function loadSequential(list) {
        return list.reduce(function (chain, src) {
            return chain.then(function () { return loadScript(src); });
        }, Promise.resolve());
    }

    function preloadPages() {
        if (HTMLScriptElement.supports && HTMLScriptElement.supports("speculationrules")) {
            var rules = document.createElement("script");
            rules.type = "speculationrules";
            rules.textContent = JSON.stringify({
                prefetch: [{ where: { href_matches: "*.html*" }, eagerness: "moderate" }]
            });
            document.head.appendChild(rules);
            return;
        }
        var done = {};
        var prefetch = function (event) {
            var link = event.target.closest && event.target.closest("a[href]");
            if (!link || link.origin !== location.origin || link.target === "_blank") return;
            var url = link.href.split("#")[0];
            if (done[url] || url === location.href.split("#")[0] || !/\.html(\?|$)/.test(link.pathname + link.search)) return;
            done[url] = true;
            var hint = document.createElement("link");
            hint.rel = "prefetch";
            hint.href = url;
            document.head.appendChild(hint);
        };
        document.addEventListener("mouseover", prefetch, { passive: true });
        document.addEventListener("touchstart", prefetch, { passive: true });
    }

    preloadPages();

    function parseBundles() {
        var raw = document.body.getAttribute("data-ksl-scripts") || "core wow";
        return raw.split(/\s+/).filter(Boolean);
    }

    var EARLY = [
        "js/sanitize.js",
        "js/ksl-content.js",
        "js/site-images.js",
        "js/site-settings.js"
    ];

    function buildQueue(names) {
        var queue = EARLY.slice();
        var page = document.body.getAttribute("data-ksl-page");
        if (page === "home" || page === "news" || page === "event") {
            queue.push("js/event-countdown.js");
        }
        if (document.getElementById("ksl-gallery-grid")) {
            queue.push("js/gallery-live.js");
        }
        if (page) {
            queue.push("js/pages/" + page + ".js");
        }
        names.forEach(function (name) {
            if (name === "core") {
                CORE.forEach(function (src) { queue.push(src); });
                return;
            }
            var pack = BUNDLES[name];
            if (pack) {
                pack.forEach(function (src) { queue.push(src); });
            }
        });
        TAIL.forEach(function (src) {
            if (EARLY.indexOf(src) === -1) queue.push(src);
        });
        return queue;
    }

    var names = parseBundles();
    if (names.indexOf("core") === -1) {
        names.unshift("core");
    }

    loadSequential(buildQueue(names)).catch(function (err) {
        console.error(err);
    });
})();
