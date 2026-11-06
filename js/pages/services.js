/* Services. Cards are drawn from the admin catalogue, then opened in the detail dialog. */
(function () {
    "use strict";

    var root = document.querySelector("main");
    if (!root || !root.querySelector(".ksl-services-grid, .service-item")) {
        return;
    }

    function escapeHtml(value) {
        return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }

    function safeUrl(value) {
        var url = String(value || "").trim();
        if (/^img\/[\w./-]+$/i.test(url) || /^https:\/\/[^\s"'<>]+$/i.test(url)) return url;
        return "";
    }

    function normalizeTitle(text) {
        return (text || "").replace(/\s+/g, " ").trim().toLowerCase();
    }

    var KNOWN_GROUPS = {
        "maintenance, repair and overhaul": "mro",
        "mro": "mro",
        "civil and modular works": "civil",
        "civil": "civil",
        "heavy engineering": "heavy",
        "leasing": "leasing",
        "production and design": "design",
        "design": "design"
    };

    var GROUP_ICONS = {
        mro: '<path d="M5 29h38l-5 9H10z"/><path d="M13 29v-6h12v6"/><path d="M17 23v-4h5"/><path d="M11 42h8M29 42h8M14 38v4M34 38v4"/><g transform="translate(27 25) rotate(-45) scale(.6)"><path stroke-width="2.8" d="M28.5-2.4A6 6 0 0 1 39.58-2.2H34v4.4h5.58A6 6 0 0 1 28.5 2.4H2.4a2.4 2.4 0 0 1 0-4.8z"/></g>',
        civil: '<path d="M6 36V16l8 6V16l8 6V14l14 8v14H6z"/><path d="M14 36v-6M22 36v-6M30 36v-6"/>',
        heavy: '<path d="m30 14 6-6 6 6-6 6"/><path d="M8 40 28 20"/><path d="m16 28 6 6"/>',
        leasing: '<circle cx="15" cy="17" r="7"/><circle cx="15" cy="17" r="2.4"/><path d="M19.95 21.95 40 42M30 32l3.5-3.5M35 37l3.5-3.5"/><path d="M11.5 23 9 30.8"/><path d="M9 29.5 4.5 33.5V43h9v-9.5z"/><circle cx="9" cy="33.5" r="1"/>',
        design: '<path d="M8 34h22l-3 6H11z"/><path d="M14 34V23h8l6 7v4"/><path d="M18 23v-5h4"/><path d="M31 11l11 3.4L39 25l-8-2.4z"/><path d="M31 22.6 27 27l8.4 1.4"/>'
    };

    var GENERIC_ICON = '<rect x="8" y="10" width="32" height="26" rx="2"/><path d="M8 18h32M18 10v26"/>';

    function groupId(category) {
        var name = normalizeTitle(category) || "general";
        if (KNOWN_GROUPS[name]) return KNOWN_GROUPS[name];
        var slug = name.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        return slug || "general";
    }

    var plus = '<svg class="ksl-ico text-primary" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
    var go = '<svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>';

    function cardHtml(item) {
        var image = safeUrl(item.image);
        return '<div class="col-lg-4 col-md-6">' +
            '<div class="service-item rounded d-flex h-100">' +
            '<div class="service-img rounded">' + (image ? '<img class="img-fluid" src="' + escapeHtml(image) + '" alt="' + escapeHtml(item.title || "") + '">' : "") + "</div>" +
            '<div class="service-text rounded p-5">' +
            '<h4 class="mb-3">' + escapeHtml(item.title || "") + "</h4>" +
            '<p class="mb-0 ksl-service-excerpt">' + escapeHtml(item.excerpt || "") + "</p>" +
            '<div class="ksl-service-foot"><button type="button" class="btn px-3 ksl-service-more" aria-haspopup="dialog" data-ksl-slug="' + escapeHtml(item.slug || "") + '" data-ksl-title="' + escapeHtml(item.title || "") + '" data-ksl-link="contact.html" data-ksl-link-label="Request a quote">' + plus + '<span class="ksl-service-more-text">Read More</span></button></div>' +
            "</div></div></div>";
    }

    function renderCatalog(data) {
        var list = root.querySelector(".ksl-svc-tabs");
        var host = list && list.parentElement;
        if (!list || !host) return;
        var order = [];
        var groups = {};
        ((data && data.items) || []).forEach(function (item) {
            var name = String(item.category || "General").trim() || "General";
            var id = groupId(name);
            if (!groups[id]) {
                groups[id] = { name: name, items: [] };
                order.push(id);
            }
            groups[id].items.push(item);
        });
        var preferred = ["mro", "civil", "heavy", "leasing", "design"];
        var saved = ((data && data.groupOrder) || []).map(function (name) { return groupId(name); });
        order.sort(function (a, b) {
            var ia = saved.indexOf(a);
            var ib = saved.indexOf(b);
            if (ia === -1) ia = saved.length + (preferred.indexOf(a) === -1 ? 100 : preferred.indexOf(a));
            if (ib === -1) ib = saved.length + (preferred.indexOf(b) === -1 ? 100 : preferred.indexOf(b));
            return ia - ib;
        });
        host.querySelectorAll(".ksl-svc-panel").forEach(function (panel) { panel.remove(); });
        list.innerHTML = order.map(function (id, index) {
            var group = groups[id];
            var count = group.items.length;
            return '<button type="button" class="ksl-svc-tab" role="tab" id="tab-' + id + '" aria-controls="' + id + '" aria-selected="' + (index === 0 ? "true" : "false") + '"' + (index === 0 ? "" : ' tabindex="-1"') + '>' +
                '<span class="ksl-svc-tab-ico"><svg viewBox="0 0 48 48" aria-hidden="true">' + (GROUP_ICONS[id] || GENERIC_ICON) + "</svg></span>" +
                '<span class="ksl-svc-tab-name">' + escapeHtml(group.name) + "</span>" +
                '<span class="ksl-svc-tab-foot"><span class="ksl-svc-tab-count">' + count + (count === 1 ? " service" : " services") + '</span><span class="ksl-svc-tab-go" aria-hidden="true">' + go + "</span></span>" +
                "</button>";
        }).join("");
        order.forEach(function (id, index) {
            var group = groups[id];
            var section = document.createElement("section");
            section.className = "ksl-svc-panel";
            section.id = id;
            section.setAttribute("role", "tabpanel");
            section.setAttribute("aria-labelledby", "tab-" + id);
            if (index !== 0) section.hidden = true;
            section.innerHTML = '<h2 class="ksl-service-category visually-hidden">' + escapeHtml(group.name) + '</h2><div class="row g-4 ksl-services-grid">' + group.items.map(cardHtml).join("") + "</div>";
            host.appendChild(section);
        });
        if (window.kslBindServiceTabs) window.kslBindServiceTabs();
    }

    function show() {
        if (window.KSL_LIVE) window.KSL_LIVE.show("[data-ksl-await='page']");
    }

    function upgradeReadMoreButtons(catalog) {
        var items = catalog.items || [];
        var cards = root.querySelectorAll(".service-item");

        cards.forEach(function (card, index) {
            var link = card.querySelector(".service-text a.btn");
            if (!link) {
                return;
            }
            var heading = card.querySelector(".service-text h4");
            var item = items[index];
            if (!item && heading) {
                var key = normalizeTitle(heading.textContent);
                item = items.find(function (entry) {
                    return normalizeTitle(entry.title) === key;
                });
            }
            if (!item) {
                return;
            }
            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = link.className + " ksl-service-more";
            btn.setAttribute("aria-haspopup", "dialog");
            btn.setAttribute("data-ksl-slug", item.slug);
            btn.innerHTML = link.innerHTML;
            link.parentNode.replaceChild(btn, link);

            var readMore = card.querySelector(".ksl-service-more");
            if (readMore) {
                var latch = function () {
                    card.classList.add("is-held");
                };
                readMore.addEventListener("mouseenter", latch);
                readMore.addEventListener("focus", latch);
            }
        });
    }

    function openFromCard(card) {
        if (!window.kslServicesCatalog) {
            return false;
        }
        var items = window.kslServicesCatalog.items || [];
        var cards = root.querySelectorAll(".service-item");
        var index = Array.prototype.indexOf.call(cards, card);
        var item = index >= 0 ? items[index] : null;
        if (!item) {
            var heading = card.querySelector(".service-text h4");
            if (!heading) {
                return false;
            }
            var key = normalizeTitle(heading.textContent);
            item = items.find(function (i) {
                return normalizeTitle(i.title) === key;
            });
        }
        if (!item) {
            return false;
        }
        var trigger = card.querySelector(".ksl-service-more");
        if (!trigger) {
            trigger = document.createElement("button");
            trigger.setAttribute("data-ksl-slug", item.slug);
        }
        if (window.showKslServiceModal) {
            window.showKslServiceModal(trigger, card);
            return true;
        }
        return false;
    }

    root.addEventListener("click", function (event) {
        var link = event.target.closest(".service-text a.btn, .ksl-service-more");
        if (!link || !root.contains(link)) {
            return;
        }
        if (link.classList.contains("ksl-service-more") && window.showKslServiceModal) {
            event.preventDefault();
            event.stopPropagation();
            window.showKslServiceModal(link, link.closest(".service-item"));
            return;
        }
        if (openFromCard(link.closest(".service-item"))) {
            event.preventDefault();
            event.stopPropagation();
        }
    });

    (window.KSL_CONTENT
        ? window.KSL_CONTENT.fetchJson("/api/public/services", "data/services.json")
        : fetch("data/services.json").then(function (res) {
            if (!res.ok) {
                throw new Error("services.json");
            }
            return res.json();
        }))
        .then(function (data) {
            window.kslServicesCatalog = data || { items: [] };
            window.kslServicesBySlug = {};
            (window.kslServicesCatalog.items || []).forEach(function (item) {
                window.kslServicesBySlug[item.slug] = item;
            });
            renderCatalog(window.kslServicesCatalog);
            upgradeReadMoreButtons(window.kslServicesCatalog);
            show();
        })
        .catch(show);
})();
