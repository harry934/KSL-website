/* Swaps photos that staff replaced in the admin. Shipped files stay if this fails. */
(function () {
    "use strict";

    var CSS_SLOTS = {
        "chrome.home-hero": "--ksl-photo-home-hero",
        "chrome.flag": "--ksl-photo-flag",
        "chrome.banner-mombasa": "--ksl-photo-banner-mombasa"
    };
    var overrides = {};

    function safeUrl(value) {
        if (typeof value !== "string" || !/^https:\/\//i.test(value)) return "";
        return value.replace(/"/g, "");
    }

    function whenLoaded(url, done) {
        var img = new Image();
        img.decoding = "async";
        if (img.fetchPriority !== undefined) img.fetchPriority = "high";
        img.onload = function () { done(); };
        img.onerror = function () {};
        img.src = url;
    }

    function paint(el) {
        var id = el.getAttribute("data-ksl-image");
        var url = id && overrides[id];
        if (!url) return;
        if (el.classList && el.classList.contains("page-header")) {
            whenLoaded(url, function () {
                el.style.setProperty("--ksl-photo-page-header", 'url("' + url + '")');
            });
            return;
        }
        if (el.tagName !== "IMG" || el.getAttribute("src") === url) return;
        whenLoaded(url, function () {
            el.src = url;
            var parent = el.parentElement;
            var href = parent && parent.getAttribute && parent.getAttribute("href");
            if (parent && parent.tagName === "A" && href && /\.(png|jpe?g|webp|gif|avif)(\?|#|$)/i.test(href)) {
                parent.setAttribute("href", url);
            }
        });
    }

    function apply(root) {
        Object.keys(CSS_SLOTS).forEach(function (id) {
            var url = overrides[id];
            if (!url) return;
            whenLoaded(url, function () {
                document.documentElement.style.setProperty(CSS_SLOTS[id], 'url("' + url + '")');
            });
        });
        var scope = root && root.querySelectorAll ? root : document;
        if (scope.nodeType === 1 && scope.getAttribute && scope.getAttribute("data-ksl-image")) paint(scope);
        scope.querySelectorAll("[data-ksl-image]").forEach(paint);
    }

    function ready() {
        document.documentElement.classList.add("ksl-photos-ready");
    }

    ready();

    function heroCrop(value) {
        if (!value || typeof value !== "object") return null;
        var x = Number(value.x);
        var y = Number(value.y);
        var w = Number(value.w);
        var h = Number(value.h);
        if (![x, y, w, h].every(function (part) { return isFinite(part); })) return null;
        x = Math.min(1, Math.max(0, x));
        y = Math.min(1, Math.max(0, y));
        w = Math.min(1, Math.max(0, w));
        h = Math.min(1, Math.max(0, h));
        if (x + w > 1) w = 1 - x;
        if (y + h > 1) h = 1 - y;
        if (w < 0.08 || h < 0.08 || (w > 0.98 && h > 0.98)) return null;
        return { x: x, y: y, w: w, h: h };
    }

    function heroTrim(value) {
        if (!value || typeof value !== "object") return null;
        var start = Number(value.start);
        var end = Number(value.end);
        if (!isFinite(start) || !isFinite(end)) return null;
        start = Math.max(0, start);
        if (!(end > start + 0.2)) return null;
        return { start: Math.round(start * 10) / 10, end: Math.round(end * 10) / 10 };
    }

    function publishHero(data) {
        var list = data && data.hero;
        if (!Array.isArray(list) || !list.length) return;
        var clean = [];
        list.forEach(function (item) {
            var url = safeUrl(item && item.url);
            var kind = item && item.kind === "video" ? "video" : "image";
            if (!url) return;
            if (kind === "video" && !/\.(mp4|webm)(\?|#|$)/i.test(url)) return;
            if (kind === "image" && !/\.(png|jpe?g|webp|gif|avif)(\?|#|$)/i.test(url)) return;
            clean.push({
                kind: kind,
                url: url,
                crop: kind === "video" ? heroCrop(item && item.crop) : null,
                trim: kind === "video" ? heroTrim(item && item.trim) : null
            });
        });
        if (!clean.length) return;
        window.KSL_HERO_MEDIA = clean;
        try {
            window.dispatchEvent(new CustomEvent("ksl-hero-media", { detail: clean }));
        } catch (err) {}
    }

    function take(data) {
        var images = data && data.images;
        if (images && typeof images === "object") {
            Object.keys(images).forEach(function (id) {
                var url = safeUrl(images[id]);
                if (url) overrides[id] = url;
            });
            apply(document);
        }
        publishHero(data);
        ready();
    }

    setTimeout(ready, 4000);

    if (window.KSL_CONTENT) {
        window.KSL_CONTENT.fetchJson("/api/public/site-images", "data/site-images.json").then(take).catch(ready);
    } else {
        ready();
    }

    var observer = new MutationObserver(function (records) {
        if (!Object.keys(overrides).length) return;
        records.forEach(function (record) {
            record.addedNodes.forEach(function (node) {
                if (node.nodeType === 1) apply(node);
            });
        });
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
})();
