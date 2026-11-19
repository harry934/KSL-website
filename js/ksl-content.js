/* Reads published content from the admin portal, then data/*.json if the portal is unreachable. */
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
        var primary = base ? base + apiPath : fallbackPath;
        return fetch(primary).then(function (res) {
            if (!res.ok) {
                throw new Error("fetch failed");
            }
            return res.json();
        }).catch(function () {
            if (!fallbackPath || primary === fallbackPath) {
                return null;
            }
            return fetch(fallbackPath).then(function (res) {
                if (!res.ok) {
                    return null;
                }
                return res.json();
            });
        });
    }

    global.KSL_CONTENT = {
        apiBase: apiBase,
        fetchJson: fetchJson
    };
})(window);
