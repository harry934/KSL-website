/* Same allow-list as the staff portal: story text, lists, headings, and safe links. */
(function (global) {
    "use strict";

    var ALLOWED = { p: 1, br: 1, strong: 1, b: 1, em: 1, i: 1, s: 1, h2: 1, h3: 1, ul: 1, ol: 1, li: 1, blockquote: 1, a: 1 };

    function escapeHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function safeLink(value) {
        var href = String(value || "").trim();
        return /^(https?:|mailto:|tel:)/i.test(href) ? href : "";
    }

    function sanitizeRichHtml(input) {
        var template = document.createElement("template");
        template.innerHTML = String(input || "");

        function clean(node) {
            var out = document.createDocumentFragment();
            Array.prototype.forEach.call(node.childNodes, function (child) {
                if (child.nodeType === 3) {
                    out.appendChild(document.createTextNode(child.textContent || ""));
                    return;
                }
                if (child.nodeType !== 1) return;
                var name = child.tagName.toLowerCase();
                if (name === "script" || name === "style") return;
                if (!ALLOWED[name]) {
                    out.appendChild(clean(child));
                    return;
                }
                var el = document.createElement(name);
                if (name === "a") {
                    var href = safeLink(child.getAttribute("href"));
                    if (!href) {
                        out.appendChild(clean(child));
                        return;
                    }
                    el.setAttribute("href", href);
                    el.setAttribute("rel", "noopener noreferrer");
                    el.setAttribute("target", "_blank");
                }
                el.appendChild(clean(child));
                out.appendChild(el);
            });
            return out;
        }

        var holder = document.createElement("div");
        holder.appendChild(clean(template.content));
        return holder.innerHTML;
    }

    global.KSL_ESCAPE = escapeHtml;
    global.KSL_SAFE_LINK = safeLink;
    global.KSL_SANITIZE = sanitizeRichHtml;
})(window);
