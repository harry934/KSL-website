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

    var ICON_MEGAPHONE =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>';
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

        var styles = { navy: 1, gold: 1, light: 1, kenya: 1, alert: 1, forest: 1, midnight: 1, framed: 1 };
        var style = styles[a.style] ? a.style : "navy";
        var ticker = !!a.scroll;
        var link = safeUrl(a.linkUrl);
        var external = /^https?:\/\//i.test(link) && link.indexOf(window.location.host) === -1;
        var text = '<p class="ksl-banner-text">' + escapeHtml(a.text) + "</p>";
        var until = endsOn && !ticker ? '<span class="ksl-banner-until">Until ' + escapeHtml(formatEndDate(endsOn)) + "</span>" : "";

        var bar = document.createElement("section");
        bar.className = "ksl-banner is-" + style + (ticker ? " is-ticker" : "");
        bar.setAttribute("aria-label", "Announcement");
        bar.innerHTML =
            '<div class="ksl-banner-inner">' +
            '<span class="ksl-banner-icon">' + ICON_MEGAPHONE + "</span>" +
            '<span class="ksl-banner-tag">' + escapeHtml(a.label || "Announcement") + "</span>" +
            '<div class="ksl-banner-body">' +
            (ticker ? '<div class="ksl-banner-track">' + text + text.replace("<p ", '<p aria-hidden="true" ') + "</div>" : text + until) +
            "</div>" +
            (link && a.linkLabel
                ? '<a class="ksl-banner-cta" href="' + escapeHtml(link) + '"' +
                  (external ? ' target="_blank" rel="noopener"' : "") + ">" +
                  escapeHtml(a.linkLabel) + ICON_ARROW + "</a>"
                : "") +
            "</div>" +
            '<button type="button" class="ksl-banner-close" aria-label="Close announcement">' + ICON_CLOSE + "</button>";

        if (ticker) {
            bar.style.setProperty("--kb-ticker-duration", Math.min(60, Math.max(16, a.text.length * 0.28)) + "s");
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
        if (nav && nav.parentNode) {
            nav.parentNode.insertBefore(bar, nav.nextSibling);
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
        var menus = { classic: 1, cards: 1, soft: 1, line: 1, compact: 1 };
        var menuStyle = data.appearance && menus[data.appearance.menuStyle] ? data.appearance.menuStyle : "classic";
        document.documentElement.setAttribute("data-ksl-menu", menuStyle);
    }).catch(function () {});
})();
