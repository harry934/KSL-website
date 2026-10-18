/* Applies the website banner and the other settings saved in the admin portal. */
/* Applies the website banner and the other settings saved in the admin portal. */
(function () {
    "use strict";

    // Static HTML already carries the default contact details; only the live portal can change them.
    if (!window.KSL_CONTENT || !window.KSL_CONTENT.apiBase()) {
        return;
    }

    function escapeHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function safeUrl(value) {
        var url = String(value || "").trim();
        return /^(https?:\/\/|mailto:|tel:)/i.test(url) || /^[\w./#?=&%-]+$/.test(url) ? url : "";
    }

    function telHref(phone) {
        return "tel:" + String(phone || "").replace(/[^\d+]/g, "");
    }

    function setTrailingText(el, text) {
        var nodes = el.childNodes;
        for (var i = nodes.length - 1; i >= 0; i--) {
            if (nodes[i].nodeType === 3 && nodes[i].textContent.trim()) {
                nodes[i].textContent = text;
                return;
            }
        }
        el.appendChild(document.createTextNode(text));
    }

    function applyContact(c) {
        if (!c) return;
        var phone = document.querySelector(".top-phone");
        if (phone && c.phone) {
            phone.href = telHref(c.phone);
            setTrailingText(phone, c.phone);
        }
        var mail = document.querySelector('.topbar-rail a[href^="mailto:"]');
        if (mail && c.email) {
            mail.href = "mailto:" + c.email;
            setTrailingText(mail, c.email);
        }
        var wa = document.querySelector(".whatsapp-fab");
        if (wa && c.whatsapp) {
            wa.href = "https://wa.me/" + String(c.whatsapp).replace(/\D/g, "");
        }
        var row = document.querySelector(".footer .row.g-4.mt-2");
        if (row) {
            row.innerHTML =
                '<div class="col-md-3"><h5 class="text-white">Inquiries / complaints</h5><p>' + escapeHtml(c.phone) +
                '<br><a class="text-light" href="mailto:' + escapeHtml(c.email) + '">' + escapeHtml(c.email) + "</a></p></div>" +
                '<div class="col-md-3"><h5 class="text-white">Office of the MD</h5><p>' + escapeHtml(c.mdPhone) +
                '<br><a class="text-light" href="mailto:' + escapeHtml(c.mdEmail) + '">' + escapeHtml(c.mdEmail) + "</a></p></div>" +
                '<div class="col-md-3"><h5 class="text-white">Address</h5><p>' + escapeHtml(c.postalAddress) + "</p></div>";
        }
    }

    function applySocial(s) {
        if (!s) return;
        [["is-facebook", s.facebook], ["is-x", s.x], ["is-instagram", s.instagram]].forEach(function (pair) {
            var url = safeUrl(pair[1]);
            document.querySelectorAll(".top-social." + pair[0]).forEach(function (a) {
                if (url) {
                    a.href = url;
                    a.hidden = false;
                } else {
                    a.hidden = true;
                }
            });
        });
    }

    function applyFooter(f) {
        if (!f) return;
        var heading = document.querySelector(".footer h2");
        if (heading && f.tagline) heading.textContent = f.tagline;
        var copyright = document.querySelector(".copyright .container");
        if (copyright && f.copyright) copyright.textContent = f.copyright;
        var locations = f.locations || [];
        if (!locations.length) return;
        document.querySelectorAll(".footer h4").forEach(function (h4) {
            if (h4.textContent.trim() !== "Locations") return;
            var col = h4.parentElement;
            col.querySelectorAll("p").forEach(function (p) { p.remove(); });
            locations.forEach(function (loc, idx) {
                var p = document.createElement("p");
                if (idx === locations.length - 1) p.className = "mb-0";
                p.innerHTML = "<strong>" + escapeHtml(loc.name) + "</strong><br>" + escapeHtml(loc.address);
                col.appendChild(p);
            });
        });
    }

    function yardIcon(paths) {
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths + "</svg>";
    }
    var YARD_ICONS = {
        "harbour-line": yardIcon('<path d="M8 21h8"/><path d="M9 21V10h6v11"/><path d="M8 10h8"/><path d="M12 10V7"/><path d="M9 8c2 1.2 4 1.2 6 0"/>'),
        "keel-stripe": yardIcon('<path d="M3 15c2.2 3.2 5.4 5 9 5s6.8-1.8 9-5"/><path d="M3 15h18"/><path d="M12 7v8"/><path d="m12 7 5-2"/>'),
        "signal-flag": yardIcon('<path d="M5 21V3"/><path d="M5 4h8l-2 3 2 3H5"/><path d="M14 21V8"/><path d="M14 9h7l-2 3 2 3h-7"/>'),
        "dry-dock": yardIcon('<path d="M3 18h18"/><path d="M5 18l2-6h10l2 6"/><path d="M8 12V8h8v4"/><path d="M12 8V5"/><path d="M4 21h16"/>'),
        "tender-notice": yardIcon('<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/><path d="M9 12h6"/><path d="M9 16h4"/>'),
        "quiet-gold": yardIcon('<circle cx="12" cy="12" r="8"/><path d="m15.2 8.8-1.4 4.6-4.6 1.4 1.4-4.6z"/>'),
        "night-watch": yardIcon('<path d="M10 5h4"/><path d="M12 5v3"/><path d="M9 8h6l1 5H8z"/><path d="M10 13v5h4v-5"/><path d="M9 18h6"/>'),
        "yard-bell": yardIcon('<path d="M6 16a6 6 0 0 1 12 0"/><path d="M5 16h14"/><path d="M10 19a2 2 0 0 0 4 0"/><path d="M12 5v2"/>'),
        "split-bar": yardIcon('<path d="M4 20h16"/><path d="M7 20V7h3v13"/><path d="M10 9h9"/><path d="M19 9v5"/><path d="M17 14h4"/>'),
        "brass-plate": yardIcon('<circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="2"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>'),
        "log-entry": yardIcon('<path d="M8 4h8v3H8z"/><path d="M8 6H6v14h12V6h-2"/><path d="M9 12h6"/><path d="M9 16h4"/>'),
        "mast-pennant": yardIcon('<path d="M6 3v18"/><path d="M6 4h11l-3.5 4L17 12H6"/>'),
        "sea-glass": yardIcon('<path d="M3 9c2 2 4 2 6 0s4-2 6 0 4 2 6 0"/><path d="M3 15c2 2 4 2 6 0s4-2 6 0 4 2 6 0"/>'),
        "alert-bar": yardIcon('<path d="M12 4 3 19h18z"/><path d="M12 9v5"/><path d="M12 17h.01"/>'),
        "chapter-head": yardIcon('<path d="M5 18h14"/><path d="M7 18 12 6l5 12"/><circle cx="12" cy="8" r="1.4"/>'),
        "inset-rule": yardIcon('<path d="M4 12h16"/><path d="M7 8 4 12l3 4"/><path d="m17 8 3 4-3 4"/><path d="M12 8v8"/>'),
        tide: yardIcon('<path d="M12 21V9"/><path d="M5 13H3a9 9 0 0 0 18 0h-2"/><circle cx="12" cy="6" r="2.4"/>'),
        "two-weights": yardIcon('<circle cx="8" cy="14" r="3"/><circle cx="16" cy="14" r="3"/><path d="M11 14h2"/><path d="M9 11l1.5-5h3L15 11"/>'),
        "command-strip": yardIcon('<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/><path d="M12 4v5M12 15v5M4 12h5M15 12h5"/>')
    };
    var ICON_ARROW =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>';
    var ICON_CLOSE =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true">' +
        '<path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';

    function todayInNairobi() {
        try {
            return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(new Date());
        } catch (e) {
            return new Date().toISOString().slice(0, 10);
        }
    }

    function formatEndDate(iso) {
        try {
            return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso + "T12:00:00"));
        } catch (e) {
            return iso;
        }
    }

    function applyAnnouncement(a) {
        if (!a || !a.enabled || !a.text) return;
        var endsOn = /^\d{4}-\d{2}-\d{2}$/.test(a.endsOn || "") ? a.endsOn : "";
        if (endsOn && todayInNairobi() > endsOn) return;
        var key = "ksl-announcement-dismissed:" + a.text;
        try {
            if (window.sessionStorage.getItem(key)) return;
        } catch (e) {}

        var designs = {
            "harbour-line": 1, "keel-stripe": 1, "signal-flag": 1, "dry-dock": 1, "tender-notice": 1,
            "quiet-gold": 1, "night-watch": 1, "yard-bell": 1, "split-bar": 1, "brass-plate": 1,
            "log-entry": 1, "mast-pennant": 1, "sea-glass": 1, "alert-bar": 1, "chapter-head": 1,
            "inset-rule": 1, "shipyard-stamp": 1, tide: 1, "two-weights": 1, "command-strip": 1
        };
        var style = designs[a.style] ? a.style : "command-strip";
        var icon = style === "shipyard-stamp" ? '<span class="ksl-banner-stamp">KSL</span>' : (YARD_ICONS[style] || "");
        var ticker = !!a.scroll;
        var link = safeUrl(a.linkUrl);
        var external = /^https?:\/\//i.test(link) && link.indexOf(window.location.host) === -1;
        var text = '<p class="ksl-banner-text">' + escapeHtml(a.text) + "</p>";
        var until = endsOn && !ticker ? '<span class="ksl-banner-until">Until ' + escapeHtml(formatEndDate(endsOn)) + "</span>" : "";
        var withArrow = style === "quiet-gold" || style === "mast-pennant";
        var ctaLabel = style === "mast-pennant"
            ? '<span class="ksl-banner-cta-label">' + escapeHtml(a.linkLabel) + "</span>"
            : escapeHtml(a.linkLabel);
        var line = text;
        var lineHidden = text.replace("<p ", '<p aria-hidden="true" ');

        var bar = document.createElement("section");
        bar.className = "ksl-banner is-" + style + (ticker ? " is-ticker" : "");
        bar.setAttribute("aria-label", "Announcement");
        bar.innerHTML =
            '<div class="ksl-banner-inner">' +
            '<span class="ksl-banner-icon">' + icon + "</span>" +
            '<span class="ksl-banner-tag">' + escapeHtml(a.label || "Announcement") + "</span>" +
            '<div class="ksl-banner-body">' +
            (ticker ? '<div class="ksl-banner-track">' + line + lineHidden + "</div>" : text + until) +
            "</div>" +
            (link && a.linkLabel
                ? '<a class="ksl-banner-cta" href="' + escapeHtml(link) + '"' +
                  (external ? ' target="_blank" rel="noopener"' : "") + ">" +
                  ctaLabel + (withArrow ? ICON_ARROW : "") + "</a>"
                : "") +
            "</div>" +
            '<button type="button" class="ksl-banner-close" aria-label="Close announcement">' + ICON_CLOSE + "</button>";

        if (ticker) {
            bar.style.setProperty("--kb-ticker-duration", Math.min(48, Math.max(26, a.text.length * 0.18)) + "s");
        }

        bar.querySelector(".ksl-banner-close").addEventListener("click", function () {
            try { window.sessionStorage.setItem(key, "1"); } catch (e) {}
            bar.style.maxHeight = bar.offsetHeight + "px";
            void bar.offsetHeight;
            bar.classList.add("is-closing");
            bar.style.maxHeight = "0px";
            window.setTimeout(function () { bar.remove(); }, 380);
        });

        var nav = document.querySelector("nav.navbar");
        var mast = nav && nav.closest(".ksl-mast");
        if (mast) {
            mast.insertBefore(bar, mast.firstChild);
        } else if (nav && nav.parentNode) {
            nav.parentNode.insertBefore(bar, nav);
        } else {
            document.body.insertBefore(bar, document.body.firstChild);
        }
    }

    window.KSL_CONTENT.fetchJson("/api/public/settings", "data/settings.json").then(function (data) {
        if (!data) return;
        applyContact(data.contact);
        applySocial(data.social);
        applyFooter(data.footer);
        applyAnnouncement(data.announcement);
    }).catch(function () {});
})();
