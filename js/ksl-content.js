/* Reads published content from the admin portal. Static data/*.json is only used when no portal is configured. */
(function (global) {
    "use strict";

    function apiBase() {
        return (document.documentElement.getAttribute("data-ksl-content-api") || "").trim().replace(/\/$/, "");
    }

    function fetchJson(apiPath, fallbackPath) {
        var pending = window.KSL_PREFETCH && window.KSL_PREFETCH[apiPath];
        if (pending && typeof pending.then === "function") {
            return pending;
        }
        var base = apiBase();
        if (!base && !fallbackPath) {
            return Promise.resolve(null);
        }
        // When a portal base is set, never silently fall back to stale data/*.json —
        // that hid admin create/edit/delete from the public site.
        if (base) {
            return fetch(base + apiPath, { cache: "no-store" }).then(function (res) {
                if (!res.ok) {
                    throw new Error("fetch failed");
                }
                return res.json();
            }).catch(function () {
                return null;
            });
        }
        return fetch(fallbackPath, { cache: "no-store" }).then(function (res) {
            if (!res.ok) {
                return null;
            }
            return res.json();
        }).catch(function () {
            return null;
        });
    }

    function portalHostname() {
        var base = apiBase();
        if (!base) return "";
        try {
            return new URL(base).hostname.toLowerCase();
        } catch (err) {
            return "";
        }
    }

    /** Extension from a stored-file URL lives in the path= query, not the pathname. */
    function storedFileExt(url) {
        try {
            var parsed = new URL(url, typeof location !== "undefined" ? location.href : "http://localhost");
            if (parsed.pathname.indexOf("/api/stored-file") === -1) return "";
            var path = parsed.searchParams.get("path") || "";
            var match = /\.([a-z0-9]+)$/i.exec(path);
            return match ? match[1].toLowerCase() : "";
        } catch (err) {
            return "";
        }
    }

    function isImageMedia(url) {
        if (/\.(jpe?g|png|webp|gif|avif)(\?|#|$)/i.test(url)) return true;
        var ext = storedFileExt(url);
        return ext === "jpg" || ext === "jpeg" || ext === "png" || ext === "webp" || ext === "gif" || ext === "avif";
    }

    function isVideoMedia(url) {
        if (/\.(mp4|webm)(\?|#|$)/i.test(url)) return true;
        var ext = storedFileExt(url);
        return ext === "mp4" || ext === "webm";
    }

    /** Accept relative img/, https, and http URLs on the portal/site host (VPS staging). */
    function safeMediaUrl(value) {
        var url = String(value || "").trim();
        if (!url || url.indexOf("..") !== -1) return "";
        if (/^\/?img\/[\w./-]+$/i.test(url)) return url.replace(/^\//, "");
        try {
            var parsed = new URL(url, typeof location !== "undefined" ? location.href : "http://localhost");
            if (parsed.protocol === "https:") return parsed.href;
            if (parsed.protocol === "http:") {
                var host = parsed.hostname.toLowerCase();
                var portal = portalHostname();
                var local = typeof location !== "undefined" ? location.hostname.toLowerCase() : "";
                if ((portal && host === portal) || (local && host === local)) return parsed.href;
            }
        } catch (err) {
            return "";
        }
        return "";
    }

    global.KSL_CONTENT = {
        apiBase: apiBase,
        fetchJson: fetchJson,
        safeMediaUrl: safeMediaUrl,
        isImageMedia: isImageMedia,
        isVideoMedia: isVideoMedia
    };
})(window);
