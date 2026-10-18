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

    function paint(el) {
        var id = el.getAttribute("data-ksl-image");
        var url = id && overrides[id];
        if (!url) return;
        if (el.classList && el.classList.contains("page-header")) {
            el.style.setProperty("--ksl-photo-page-header", 'url("' + url + '")');
            return;
        }
        if (el.tagName !== "IMG" || el.getAttribute("src") === url) return;
        if (el.tagName === "IMG") {
            el.src = url;
            var parent = el.parentElement;
            var href = parent && parent.getAttribute && parent.getAttribute("href");
            if (parent && parent.tagName === "A" && href && /\.(png|jpe?g|webp|gif|avif)(\?|#|$)/i.test(href)) {
                parent.setAttribute("href", url);
            }
        }
    }

    function apply(root) {
        Object.keys(CSS_SLOTS).forEach(function (id) {
            if (overrides[id]) {
                document.documentElement.style.setProperty(CSS_SLOTS[id], 'url("' + overrides[id] + '")');
            }
        });
        var scope = root && root.querySelectorAll ? root : document;
        if (scope.nodeType === 1 && scope.getAttribute && scope.getAttribute("data-ksl-image")) paint(scope);
        scope.querySelectorAll("[data-ksl-image]").forEach(paint);
    }

    function ready() {
        document.documentElement.classList.add("ksl-photos-ready");
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
