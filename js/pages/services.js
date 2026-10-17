/* Services and the detail shown when a card is opened. */
(function () {
    "use strict";

    var grid = document.querySelector("main .row.g-4");
    if (!grid || !grid.querySelector(".service-item")) {
        return;
    }

    function normalizeTitle(text) {
        return (text || "").replace(/\s+/g, " ").trim().toLowerCase();
    }

    function upgradeReadMoreButtons(catalog) {
        var items = catalog.items || [];
        var cards = grid.querySelectorAll(".service-item");

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
        var cards = grid.querySelectorAll(".service-item");
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

    grid.addEventListener("click", function (event) {
        var link = event.target.closest(".service-text a.btn");
        if (!link || !grid.contains(link)) {
            return;
        }
        if (link.classList.contains("ksl-service-more")) {
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
            window.kslServicesCatalog = data;
            window.kslServicesBySlug = {};
            (data.items || []).forEach(function (item) {
                window.kslServicesBySlug[item.slug] = item;
            });
            upgradeReadMoreButtons(data);
        })
        .catch(function () {
            /* cards keep contact links if data fails */
        });
})();
