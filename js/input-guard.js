/* Whitelist validation for site search and the contact form (client-side; server repeats). */
(function (global) {
    "use strict";

    var SCOPE = ".ksl-search, .ksl-mobile-menu-search, .ksl-empty-search, .ksl-contact-form";
    var LIMITS = { search: 120, name: 80, email: 200, subject: 160, message: 4000 };
    var SEARCH_CHARS = /^[\p{L}\p{N}\s'.-]+$/u;
    var NAME_CHARS = /^[\p{L}\p{M}\s'.-]+$/u;
    var SUBJECT_CHARS = /^[\p{L}\p{N}\p{M}\s.,;:!?'"()[\]\-/&%+@#_]+$/u;

    function hasControlChar(text) {
        var i;
        for (i = 0; i < text.length; i++) {
            var cp = text.codePointAt(i);
            if (cp < 32 && cp !== 9 && cp !== 10 && cp !== 13) return true;
            if (cp === 0x7f) return true;
            if (cp > 0xffff) i++;
        }
        return false;
    }

    function isAllowedPublicSearchQuery(value) {
        var text = String(value == null ? "" : value).trim();
        if (!text || text.length > LIMITS.search) return false;
        return SEARCH_CHARS.test(text);
    }

    function isAllowedContactName(value) {
        var text = String(value == null ? "" : value).trim();
        if (!text || text.length > LIMITS.name) return false;
        if (!NAME_CHARS.test(text) || !/\p{L}/u.test(text)) return false;
        return true;
    }

    function isAllowedContactNameOptional(value) {
        var text = String(value == null ? "" : value).trim();
        if (!text) return true;
        return isAllowedContactName(text);
    }

    function isAllowedContactEmail(value) {
        var text = String(value == null ? "" : value).trim().toLowerCase();
        if (!text || text.length > LIMITS.email) return false;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return false;
        var parts = text.split("@");
        var local = parts[0];
        var domain = parts[1];
        if (!local || !domain) return false;
        if (!/^[\p{L}\p{N}._%+\-]+$/u.test(local)) return false;
        if (!/^[\p{L}\p{N}.-]+$/u.test(domain)) return false;
        return true;
    }

    function isAllowedContactSubject(value) {
        var text = String(value == null ? "" : value).trim();
        if (!text || text.length > LIMITS.subject) return false;
        return SUBJECT_CHARS.test(text);
    }

    function isAllowedContactMessage(value) {
        var text = String(value == null ? "" : value);
        if (!text || text.length > LIMITS.message) return false;
        if (hasControlChar(text)) return false;
        if (text.indexOf("<") !== -1 || text.indexOf(">") !== -1) return false;
        if (/(?:javascript|vbscript)\s*:/i.test(text)) return false;
        if (/data\s*:\s*text\/html/i.test(text)) return false;
        if (/\bon[a-z]{2,}\s*=/i.test(text)) return false;
        return true;
    }

    function allowedForField(el, value) {
        if (!el || !el.name) return true;
        var name = el.name;
        if (name === "website") return true;
        if (name === "s") return isAllowedPublicSearchQuery(value);
        if (name === "first_name" || name === "surname") return isAllowedContactName(value);
        if (name === "other_name") return isAllowedContactNameOptional(value);
        if (name === "email") return isAllowedContactEmail(value);
        if (name === "subject") return isAllowedContactSubject(value);
        if (name === "message") return isAllowedContactMessage(value);
        if (name === "pref") return true;
        return isAllowedPublicSearchQuery(value);
    }

    function inScope(el) {
        if (!el || !el.closest) return false;
        if (el.matches(SCOPE) || el.closest(SCOPE)) return true;
        if (el.matches('input[name="s"], textarea[name="s"], textarea[name="message"], input[name="subject"]')) return true;
        if (el.matches("form") && el.querySelector('input[name="s"], textarea[name="message"]')) return true;
        return !!el.closest("#searchModal, form");
    }

    function leave() {
        var path = global.location.pathname || "";
        var search = global.location.search || "";
        if (/404\.html$/i.test(path) && /(?:^|[?&])blocked=1(?:&|$)/.test(search)) return;
        global.location.replace("404.html?blocked=1");
    }

    global.KSL_INPUT = {
        isAllowedPublicSearchQuery: isAllowedPublicSearchQuery,
        isAllowedContactName: isAllowedContactName,
        isAllowedContactNameOptional: isAllowedContactNameOptional,
        isAllowedContactEmail: isAllowedContactEmail,
        isAllowedContactSubject: isAllowedContactSubject,
        isAllowedContactMessage: isAllowedContactMessage,
    };

    /** Backwards compatibility for older snippets. */
    global.KSL_LOOKS_LIKE_CODE = function (value) {
        return !isAllowedContactMessage(String(value == null ? "" : value));
    };

    document.addEventListener("input", function (event) {
        var el = event.target;
        if (!el || el.name === "website" || !inScope(el)) return;
        if (allowedForField(el, el.value)) return;
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
            if (allowedForField(fields[i], fields[i].value)) continue;
            event.preventDefault();
            event.stopPropagation();
            leave();
            return;
        }
    }, true);

    var posted = new URLSearchParams(global.location.search).get("s");
    if (posted && !isAllowedPublicSearchQuery(posted)) leave();
})(window);