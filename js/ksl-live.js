/* Starts the admin fetches while the page is still parsing, and keeps saved copy hidden until it arrives. */
(function () {
    "use strict";

    var style = document.createElement("style");
    style.textContent = "[data-ksl-await]:not(.is-live){visibility:hidden}img[data-ksl-image]:not(.is-live){visibility:hidden}";
    document.head.appendChild(style);

    function list(target) {
        if (!target) return document.querySelectorAll("[data-ksl-await]");
        if (typeof target === "string") return document.querySelectorAll(target);
        if (target.nodeType) return [target];
        return target;
    }

    window.KSL_LIVE = {
        show: function (target) {
            Array.prototype.forEach.call(list(target), function (el) {
                if (el && el.classList) el.classList.add("is-live");
            });
            var spinner = document.getElementById("spinner");
            if (spinner) spinner.classList.remove("show");
        }
    };

    var root = document.documentElement;
    var base = (root.getAttribute("data-ksl-content-api") || "").trim().replace(/\/$/, "");
    var page = root.getAttribute("data-ksl-page") || "";
    var files = {
        "/api/public/settings": "data/settings.json",
        "/api/public/site-images": "data/site-images.json",
        "/api/public/organization": "data/organization.json",
        "/api/public/downloads": "data/downloads.json",
        "/api/public/news": "data/news.json",
        "/api/public/events": "data/events.json",
        "/api/public/press": "data/press.json",
        "/api/public/gallery": "data/gallery.json",
        "/api/public/products": "data/products.json",
        "/api/public/services": "data/services.json",
        "/api/public/projects": "data/projects.json",
        "/api/public/faq": "data/faq.json",
        "/api/public/csr": "data/csr.json",
        "/api/public/careers": "data/careers.json"
    };
    var byPage = {
        home: ["/api/public/news", "/api/public/events"],
        about: ["/api/public/organization"],
        organization: ["/api/public/organization", "/api/public/downloads"],
        board: ["/api/public/organization"],
        news: ["/api/public/news", "/api/public/events", "/api/public/press", "/api/public/downloads"],
        article: ["/api/public/news"],
        event: ["/api/public/events"],
        products: ["/api/public/products"],
        services: ["/api/public/services"],
        projects: ["/api/public/projects"],
        faq: ["/api/public/faq"],
        csr: ["/api/public/csr"],
        careers: ["/api/public/careers"],
        downloads: ["/api/public/downloads"]
    };
    var extra = (root.getAttribute("data-ksl-prefetch") || "").trim().split(/\s+/).filter(Boolean);
    var paths = ["/api/public/settings", "/api/public/site-images"].concat(byPage[page] || [], extra);
    var seen = {};
    window.KSL_PREFETCH = window.KSL_PREFETCH || {};

    function fromFile(path) {
        return fetch(path).then(function (res) {
            if (!res.ok) return null;
            return res.json();
        }).catch(function () { return null; });
    }

    paths.forEach(function (path) {
        if (seen[path] || !files[path]) return;
        seen[path] = true;
        var fallback = files[path];
        // With a portal base configured, do not fall back to stale data/*.json —
        // admin edits must win over committed snapshots.
        window.KSL_PREFETCH[path] = base
            ? fetch(base + path, { cache: "no-store" }).then(function (res) {
                if (!res.ok) throw new Error("live");
                return res.json();
            }).catch(function () { return null; })
            : fromFile(fallback);
    });
})();
