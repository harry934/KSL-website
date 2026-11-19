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
        safeMediaUrl: safeMediaUrl
    };
})(window);
