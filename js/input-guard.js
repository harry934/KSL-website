/* Stops code-like text in search and the contact form. */
(function (global) {
    "use strict";

    var SCOPE = ".ksl-search, .ksl-mobile-menu-search, .ksl-empty-search, .ksl-contact-form";

    function looksLikeCode(value) {
        var text = String(value == null ? "" : value);
        if (!text) return false;
        var decoded = text
            .replace(/\\u003c/gi, "<")
            .replace(/\\u003e/gi, ">")
            .replace(/&#x0*3c;?/gi, "<")
            .replace(/&#0*60;?/gi, "<")
            .replace(/&#x0*3e;?/gi, ">")
            .replace(/&#0*62;?/gi, ">")
            .replace(/&lt;/gi, "<")
            .replace(/&gt;/gi, ">")
            .replace(/%3c/gi, "<")
            .replace(/%3e/gi, ">");
        return /<\s*\/?\s*(script|iframe|object|embed|svg|math|link|meta|style|base|form|img|video|source|body|html|xml)\b/i.test(decoded) ||
            /javascript\s*:/i.test(decoded) ||
            /vbscript\s*:/i.test(decoded) ||
            /data\s*:\s*text\/html/i.test(decoded) ||
            /\bon[a-z]+\s*=/i.test(decoded) ||
            /\b(document\.cookie|document\.write|eval\s*\()/i.test(decoded);
    }

    function inScope(el) {
        if (!el || !el.closest) return false;
        return el.matches(SCOPE) || !!el.closest(SCOPE);
    }

    function leave() {
        var path = global.location.pathname || "";
        var search = global.location.search || "";
        if (/404\.html$/i.test(path) && /(?:^|[?&])blocked=1(?:&|$)/.test(search)) return;
        global.location.replace("404.html?blocked=1");
    }

    global.KSL_LOOKS_LIKE_CODE = looksLikeCode;

    document.addEventListener("input", function (event) {
        var el = event.target;
        if (!el || el.name === "website" || !inScope(el)) return;
        if (!looksLikeCode(el.value)) return;
        event.preventDefault();
        event.stopPropagation();
        leave();
    }, true);

    document.addEventListener("submit", function (event) {
        var form = event.target;
        if (!form || !form.querySelectorAll || !inScope(form)) return;
        var fields = form.querySelectorAll("input, textarea");
        var i;
        for (i = 0; i < fields.length; i += 1) {
            if (fields[i].name === "website") continue;
            if (!looksLikeCode(fields[i].value)) continue;
            event.preventDefault();
            event.stopPropagation();
            leave();
            return;
        }
    }, true);

    var posted = new URLSearchParams(global.location.search).get("s");
    if (looksLikeCode(posted)) leave();
})(window);
