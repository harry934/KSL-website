(function () {
    "use strict";

    var ASSET_V = "20261009-31";

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
        "https://code.jquery.com/jquery-3.4.1.min.js",
        "https://cdn.jsdelivr.net/npm/bootstrap@5.0.0/dist/js/bootstrap.bundle.min.js"
    ];

    var TAIL = [
        "js/access.js",
        "js/lang.js",
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

    function parseBundles() {
        var raw = document.body.getAttribute("data-ksl-scripts") || "core wow";
        return raw.split(/\s+/).filter(Boolean);
    }

    function buildQueue(names) {
        var queue = [];
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
        TAIL.forEach(function (src) { queue.push(src); });
        var page = document.body.getAttribute("data-ksl-page");
        if (page) {
            queue.push("js/pages/" + page + ".js");
        }
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
