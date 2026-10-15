(function (global) {
    "use strict";

    function apiBase() {
        return (document.documentElement.getAttribute("data-ksl-content-api") || "").trim().replace(/\/$/, "");
    }

    function fetchJson(apiPath, fallbackPath) {
        var base = apiBase();
        var primary = base ? base + apiPath : fallbackPath;
        return fetch(primary).then(function (res) {
            if (!res.ok) {
                throw new Error("fetch failed");
            }
            return res.json();
        }).catch(function () {
            if (primary === fallbackPath) {
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
