/* Same allow-list as the staff portal: story text, lists, headings, and safe links. */
(function (global) {
    "use strict";

    var ALLOWED = { p: 1, br: 1, strong: 1, b: 1, em: 1, i: 1, s: 1, h2: 1, h3: 1, ul: 1, ol: 1, li: 1, blockquote: 1, a: 1 };

    function sanitizeRichHtml(input) {
        var html = String(input || "");
        html = html.replace(/<!--[\s\S]*?-->/g, "");
        html = html.replace(/<\s*(script|style|iframe|object|embed|form|svg|math|link|meta)\b[\s\S]*?<\/\s*\1\s*>/gi, "");
        html = html.replace(/<\s*(script|style|iframe|object|embed|form|svg|math|link|meta)\b[^>]*\/?\s*>/gi, "");
        html = html.replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, function (full, raw, attrs) {
            var name = String(raw).toLowerCase();
            if (!ALLOWED[name]) return "";
            if (name === "br") return "<br>";
            if (full.charAt(1) === "/") return "</" + name + ">";
            if (name !== "a") return "<" + name + ">";
            var match = String(attrs).match(/\shref\s*=\s*("([^"]*)"|'([^']*)')/i);
            var href = (match ? (match[2] || match[3] || "") : "").trim().replace(/"/g, "");
            if (!/^(https?:|mailto:|tel:)/i.test(href)) return "";
            return '<a href="' + href + '" rel="noopener noreferrer" target="_blank">';
        });
        return html;
    }

    global.KSL_SANITIZE = sanitizeRichHtml;
})(window);
