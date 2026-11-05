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

    function panelFor(category) {
        var key = normalizeTitle(category);
        if (key.indexOf("maintenance") !== -1 || key === "mro") return "mro";
        if (key.indexOf("civil") !== -1) return "civil";
        if (key.indexOf("heavy") !== -1) return "heavy";
        if (key.indexOf("leas") !== -1) return "leasing";
        return "";
    }

    var plus = '<svg class="ksl-ico text-primary" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';

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
        var groups = {};
        ((data && data.items) || []).forEach(function (item) {
            var id = panelFor(item.category);
            if (!id) return;
            if (!groups[id]) groups[id] = [];
            groups[id].push(item);
        });
        Object.keys(groups).forEach(function (id) {
            var panel = document.getElementById(id);
            var grid = panel && panel.querySelector(".ksl-services-grid");
            if (grid) grid.innerHTML = groups[id].map(cardHtml).join("");
            var tab = document.getElementById("tab-" + id);
            if (!tab) return;
            var name = tab.querySelector(".ksl-svc-tab-name");
            var count = tab.querySelector(".ksl-svc-tab-count");
            if (name && groups[id][0].category) name.textContent = groups[id][0].category;
            if (count) {
                count.textContent = groups[id].length + (groups[id].length === 1 ? " service" : " services");
            }
        });
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
