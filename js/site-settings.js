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

    function applyAnnouncement(a) {
        if (!a || !a.enabled || !a.text) return;
        var key = "ksl-announcement-dismissed:" + a.text;
        try {
            if (window.sessionStorage.getItem(key)) return;
        } catch (e) {}
        var bar = document.createElement("div");
        bar.className = "ksl-announcement";
        bar.setAttribute("role", "region");
        bar.setAttribute("aria-label", "Announcement");
        var link = safeUrl(a.linkUrl);
        bar.innerHTML =
            '<p><span>' + escapeHtml(a.text) + "</span>" +
            (link && a.linkLabel ? ' <a href="' + escapeHtml(link) + '">' + escapeHtml(a.linkLabel) + "</a>" : "") +
            '</p><button type="button" aria-label="Dismiss announcement">&times;</button>';
        bar.querySelector("button").addEventListener("click", function () {
            bar.remove();
            try { window.sessionStorage.setItem(key, "1"); } catch (e) {}
        });
        document.body.insertBefore(bar, document.body.firstChild);
    }

    window.KSL_CONTENT.fetchJson("/api/public/settings", "data/settings.json").then(function (data) {
        if (!data) return;
        applyContact(data.contact);
        applySocial(data.social);
        applyFooter(data.footer);
        applyAnnouncement(data.announcement);
    }).catch(function () {});
})();
