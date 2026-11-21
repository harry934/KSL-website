/* Applies the website banner and the other settings saved in the admin portal. */
/* Applies the website banner and the other settings saved in the admin portal. */
(function () {
    "use strict";

    // Static HTML already carries the default contact details; only the live portal can change them.
    function revealSettings() {
        if (window.KSL_LIVE) window.KSL_LIVE.show("[data-ksl-await='settings']");
    }

    if (!window.KSL_CONTENT || !window.KSL_CONTENT.apiBase()) {
        revealSettings();
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

    /** Keep paragraph breaks when detail is stored in an HTML attribute. */
    function escapeAttr(value) {
        return escapeHtml(value).replace(/\r\n|\r|\n/g, "&#10;");
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
        var row = document.querySelector(".footer [data-ksl-contact]");
        if (row) {
            row.innerHTML =
                '<div class="col-md-3"><h5 class="text-white">Inquiries / complaints</h5><p>' + escapeHtml(c.phone) +
                '<br><a class="text-light" href="mailto:' + escapeHtml(c.email) + '">' + escapeHtml(c.email) + "</a></p></div>" +
                '<div class="col-md-3"><h5 class="text-white">Office of the MD</h5><p>' + escapeHtml(c.mdPhone) +
                '<br><a class="text-light" href="mailto:' + escapeHtml(c.mdEmail) + '">' + escapeHtml(c.mdEmail) + "</a></p></div>" +
                '<div class="col-md-3"><h5 class="text-white">Address</h5><p>' + escapeHtml(c.postalAddress) +
                '<br><span data-ksl-address-iso><span class="ksl-address-iso-mark">ISO 9001:2015</span><span class="ksl-address-iso-note">Certified quality management system</span></span></p></div>';
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
        var copyEl = document.querySelector("[data-ksl-footer-copy]");
        if (copyEl && f.copyright) copyEl.textContent = f.copyright;
        var locations = f.locations || [];
        document.querySelectorAll(".footer h4").forEach(function (h4) {
            if (h4.textContent.trim() !== "Locations") return;
            var col = h4.parentElement;
            col.querySelectorAll("p").forEach(function (p) { p.remove(); });
            locations.forEach(function (loc, idx) {
                var p = document.createElement("p");
                if (idx === locations.length - 1) p.className = "mb-0";
                else p.className = "mb-2";
                p.innerHTML = "<strong>" + escapeHtml(loc.name) + "</strong><br>" + escapeHtml(loc.address);
                col.appendChild(p);
            });
        });
        if (f.qualitySystem) {
            var isoShort = f.qualitySystem.replace(/ certified quality management system$/i, " certified");
            document.querySelectorAll(".ksl-footer-iso-badge--copy[data-ksl-footer-iso]").forEach(function (el) {
                el.textContent = isoShort;
            });
            document.querySelectorAll(".copyright .ksl-footer-iso-badge:not(.ksl-footer-iso-badge--copy)[data-ksl-footer-iso]").forEach(function (el) {
                el.textContent = isoShort;
            });
        }
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

    function cssImageUrl(value) {
        var url = String(value || "").trim();
        if (url.length > 500 || /[\s"'()\\]/.test(url)) return "";
        if (/^https:\/\/[^/]+\/.+/i.test(url)) return 'url("' + url + '")';
        if (url.charAt(0) === "/" && url.charAt(1) !== "/") return 'url("' + url + '")';
        return "";
    }

    function bannerInWindow(item, today) {
        var start = /^\d{4}-\d{2}-\d{2}$/.test(item.startsOn || "") ? item.startsOn : "";
        var end = /^\d{4}-\d{2}-\d{2}$/.test(item.endsOn || "") ? item.endsOn : "";
        if (start && today < start) return false;
        if (end && today > end) return false;
        return true;
    }

    function activeBanner(a) {
        if (!a) return null;
        var today = todayInNairobi();
        var list = a.queue && a.queue.length ? a.queue : [a];
        for (var i = 0; i < list.length; i++) {
            var item = list[i];
            if (!item || item.enabled === false || !String(item.text || "").trim()) continue;
            if (!bannerInWindow(item, today)) continue;
            item.photos = a.photos || {};
            return item;
        }
        return null;
    }

    function applyAnnouncement(a) {
        if (!a || !a.enabled || !a.text) return;
        var endsOn = /^\d{4}-\d{2}-\d{2}$/.test(a.endsOn || "") ? a.endsOn : "";
        if (endsOn && todayInNairobi() > endsOn) return;
        if (document.body.classList.contains("ksl-404")) return;
        var key = "ksl-announcement-dismissed:" + (a.id || "") + ":" + a.text;
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
        if (style === "quay" || style === "berth" || style === "channel") {
            bar.classList.add("is-waiting");
            bar.classList.remove("is-photo-ready");
            var photo = cssImageUrl(a.photos && a.photos[style]);
            if (photo) {
                var raw = String((a.photos && a.photos[style]) || "").trim();
                var preload = new Image();
                preload.onload = function () {
                    bar.style.setProperty("--ksl-banner-photo", photo);
                    bar.classList.remove("is-waiting");
                    bar.classList.add("is-photo-ready");
                };
                preload.onerror = function () {
                    bar.classList.remove("is-waiting");
                };
                preload.src = raw;
            }
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

    var WHAT_WE_DO_ICONS = {
        ship: '<path d="M8 30h32l-4 8H12z"/><path d="M16 30V18h8l8 8h4v4"/><path d="M20 18V12h6"/>',
        civil: '<path d="M6 36V16l8 6V16l8 6V14l14 8v14H6z"/><path d="M14 36v-6M22 36v-6M30 36v-6"/>',
        heavy: '<path d="m30 14 6-6 6 6-6 6"/><path d="M8 40 28 20"/><path d="m16 28 6 6"/>',
        mro: '<path d="M5 29h38l-5 9H10z"/><path d="M13 29v-6h12v6"/><path d="M17 23v-4h5"/><path d="M11 42h8M29 42h8M14 38v4M34 38v4"/><g transform="translate(27 25) rotate(-45) scale(.6)"><path stroke-width="2.8" d="M28.5-2.4A6 6 0 0 1 39.58-2.2H34v4.4h5.58A6 6 0 0 1 28.5 2.4H2.4a2.4 2.4 0 0 1 0-4.8z"/></g>',
        grp: '<path d="M6 30c4 4 8 4 12 0s8-4 12 0 8 4 12 0"/><path d="M6 20c4 4 8 4 12 0s8-4 12 0 8 4 12 0"/><path d="M18 12h6l4 6H14z"/>'
    };

    function applyWhatWeDo(settings) {
        var grid = document.querySelector("[data-ksl-what-we-do]");
        if (!grid || !settings) return;
        var label = document.querySelector("[data-ksl-what-we-do-label]");
        if (label && settings.label) label.textContent = settings.label;
        var cards = (settings.cards || []).filter(function (card) {
            return card && card.enabled !== false && String(card.title || "").trim();
        });
        if (!cards.length) return;
        var delays = ["0.1s", "0.3s", "0.5s", "0.1s", "0.3s", "0.5s"];
        grid.innerHTML = cards.map(function (card, index) {
            var icon = WHAT_WE_DO_ICONS[card.icon] || WHAT_WE_DO_ICONS.ship;
            var customImage = safeUrl(card.image);
            var image = customImage || "img/ksl/yard.jpg";
            // Only use the legacy site-image slot when no custom photo is set.
            var slot = !customImage && card.imageSlot ? ' data-ksl-image="' + escapeHtml(card.imageSlot) + '"' : "";
            var link = safeUrl(card.link) || "";
            var linkLabel = card.linkLabel || "";
            var link2 = safeUrl(card.secondaryLink) || "";
            var linkLabel2 = card.secondaryLabel || "";
            var link3 = safeUrl(card.tertiaryLink) || "";
            var linkLabel3 = card.tertiaryLabel || "";
            var buttonLabel = card.buttonLabel || "Read More";
            return (
                '<div class="col-lg-4 col-md-6 wow fadeInUp" data-wow-delay="' + delays[index % delays.length] + '">' +
                '<div class="service-item rounded d-flex h-100">' +
                '<div class="service-img rounded"><img' + slot + ' class="img-fluid" src="' + escapeHtml(image) + '" alt="' + escapeHtml(card.title) + '"></div>' +
                '<div class="service-text rounded p-5">' +
                '<svg class="ksl-svc" viewBox="0 0 48 48" aria-hidden="true">' + icon + "</svg>" +
                '<h4 class="mb-3">' + escapeHtml(card.title) + "</h4>" +
                '<p class="mb-0 ksl-service-excerpt">' + escapeHtml(card.excerpt || "") + "</p>" +
                '<div class="ksl-service-foot">' +
                '<button type="button" class="btn px-3 ksl-service-more" aria-haspopup="dialog"' +
                ' data-ksl-title="' + escapeAttr(card.title) + '"' +
                ' data-ksl-detail="' + escapeAttr(card.detail || "") + '"' +
                ' data-ksl-link="' + escapeAttr(link) + '"' +
                ' data-ksl-link-label="' + escapeAttr(linkLabel) + '"' +
                ' data-ksl-link-2="' + escapeAttr(link2) + '"' +
                ' data-ksl-link-label-2="' + escapeAttr(linkLabel2) + '"' +
                ' data-ksl-link-3="' + escapeAttr(link3) + '"' +
                ' data-ksl-link-label-3="' + escapeAttr(linkLabel3) + '">' +
                '<svg class="ksl-ico text-primary" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>' +
                '<span class="ksl-service-more-text">' + escapeHtml(buttonLabel) + "</span></button>" +
                "</div></div></div></div>"
            );
        }).join("");
        grid.querySelectorAll(".service-item").forEach(function (card) {
            var readMore = card.querySelector(".ksl-service-more");
            if (!readMore) return;
            var showPhoto = function () { card.classList.add("is-held"); };
            var hidePhoto = function () { card.classList.remove("is-held"); };
            readMore.addEventListener("mouseenter", showPhoto);
            readMore.addEventListener("mouseleave", hidePhoto);
            readMore.addEventListener("focus", showPhoto);
            readMore.addEventListener("blur", hidePhoto);
        });
        if (window.KSL_SITE_IMAGES && typeof window.KSL_SITE_IMAGES.refresh === "function") {
            window.KSL_SITE_IMAGES.refresh(grid);
        }
    }

    window.KSL_CONTENT.fetchJson("/api/public/settings", "data/settings.json").then(function (data) {
        if (!data) {
            revealSettings();
            return;
        }
        applyContact(data.contact);
        applySocial(data.social);
        applyFooter(data.footer);
        applyAnnouncement(activeBanner(data.announcement));
        applyWhatWeDo(data.what_we_do);
        revealSettings();
    }).catch(revealSettings);
})();
