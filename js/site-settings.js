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
        tide: yardIcon('<path d="M12 21V9"/><path d="M5 13H3a9 9 0 0 0 18 0h-2"/><circle cx="12" cy="6" r="2.4"/>'),
        alert: yardIcon('<path d="M12 4 3 19h18z"/><path d="M12 9v5"/><path d="M12 17h.01"/>')
    };
    var DESIGN_ALIASES = {
        notice: "notice", "harbour-line": "notice", "quiet-gold": "notice", "log-entry": "notice",
        "chapter-head": "notice", "inset-rule": "notice", "two-weights": "notice", "sea-glass": "notice",
        light: "notice", framed: "notice",
        navy: "navy", "keel-stripe": "navy", "yard-bell": "navy", "shipyard-stamp": "navy",
        "command-strip": "navy", "dry-dock": "navy", gold: "navy", forest: "navy",
        tide: "tide",
        flag: "flag", "signal-flag": "flag", kenya: "flag",
        split: "split", "split-bar": "split",
        pennant: "pennant", "mast-pennant": "pennant",
        plate: "plate", "brass-plate": "plate",
        night: "night", "night-watch": "night", midnight: "night",
        tender: "tender", "tender-notice": "tender",
        alert: "alert", "alert-bar": "alert",
        "nav-line": "nav-line",
        quay: "quay", berth: "berth", channel: "channel",
        lake: "quay", shore: "quay", reed: "quay", yard: "quay",
        corner: "navy", launch: "navy"
    };
    function bannerPlacement(style) {
        if (style === "nav-line") return "nav";
        return "bar";
    }
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
        if (document.body.classList.contains("ksl-404")) return;
        var key = "ksl-announcement-dismissed:" + a.text;
        try {
            if (window.sessionStorage.getItem(key)) return;
        } catch (e) {}

        var style = DESIGN_ALIASES[a.style] || "navy";
        var place = bannerPlacement(style);
        var icon = YARD_ICONS[style] || "";
        var ticker = !!a.scroll && place === "bar";
        var link = safeUrl(a.linkUrl);
        var external = /^https?:\/\//i.test(link) && link.indexOf(window.location.host) === -1;
        var text = '<p class="ksl-banner-text">' + escapeHtml(a.text) + "</p>";
        var until = endsOn && !ticker ? '<span class="ksl-banner-until">Until ' + escapeHtml(formatEndDate(endsOn)) + "</span>" : "";
        var withArrow = false;
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

        function dismiss() {
            try { window.sessionStorage.setItem(key, "1"); } catch (e) {}
            bar.style.maxHeight = bar.offsetHeight + "px";
            void bar.offsetHeight;
            bar.classList.add("is-closing");
            bar.style.maxHeight = "0px";
            window.setTimeout(function () { bar.remove(); }, 380);
        }

        bar.querySelector(".ksl-banner-close").addEventListener("click", function (event) {
            event.stopPropagation();
            dismiss();
        });

        var nav = document.querySelector("nav.navbar");
        var mast = nav && nav.closest(".ksl-mast");
        if (place === "nav" && nav) {
            nav.appendChild(bar);
        } else if (mast) {
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
