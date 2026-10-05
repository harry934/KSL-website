(function () {
    "use strict";

    var mount = document.getElementById("ksl-home-news-grid");
    if (!mount) {
        return;
    }

    var arrow = '<svg class="ksl-feed-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>';
    var items = [];

    function formatDate(iso) {
        try {
            return new Date(iso + "T12:00:00").toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" });
        } catch (e) {
            return iso;
        }
    }

    function escapeHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function feedCard(item) {
        return (
            '<button type="button" class="ksl-feed-card" data-ksl-slug="' + escapeHtml(item.slug) + '">' +
            '<span class="ksl-feed-photo"><img src="' + escapeHtml(item.image) + '" alt="" loading="lazy" decoding="async"></span>' +
            '<span class="ksl-feed-body">' +
            '<span class="ksl-feed-top"><span class="ksl-feed-pill">' + escapeHtml(item.category || "News") + "</span>" + arrow + "</span>" +
            '<span class="ksl-feed-name">' + escapeHtml(item.title) + "</span>" +
            '<span class="ksl-feed-meta">' + escapeHtml(formatDate(item.date)) + "</span>" +
            "</span></button>"
        );
    }

    var modal = document.createElement("div");
    modal.className = "ksl-feed-modal";
    modal.id = "kslHomeNewsModal";
    modal.hidden = true;
    modal.innerHTML =
        '<div class="ksl-feed-modal-backdrop" data-feed-close></div>' +
        '<div class="ksl-feed-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="kslHomeNewsTitle">' +
        '<button type="button" class="ksl-feed-modal-close" data-feed-close aria-label="Close">&times;</button>' +
        '<div class="ksl-feed-modal-photo"><img alt=""></div>' +
        '<div class="ksl-feed-modal-copy">' +
        '<p class="ksl-feed-pill" id="kslHomeNewsLabel"></p>' +
        '<h2 id="kslHomeNewsTitle"></h2>' +
        '<p class="ksl-feed-modal-meta"></p>' +
        '<div class="ksl-feed-modal-body"></div>' +
        '<a class="btn btn-primary" id="kslHomeNewsMore" href="news.html">Read the full article</a>' +
        "</div></div>";
    (document.getElementById("ksl-page") || document.body).appendChild(modal);

    var lastCard = null;

    function openItem(item, card) {
        if (!item) return;
        lastCard = card || null;
        modal.querySelector(".ksl-feed-modal-photo img").src = item.image || "";
        modal.querySelector("#kslHomeNewsLabel").textContent = item.category || "News";
        modal.querySelector("#kslHomeNewsTitle").textContent = item.title || "";
        modal.querySelector(".ksl-feed-modal-meta").textContent = formatDate(item.date);
        var body = modal.querySelector(".ksl-feed-modal-body");
        if (item.body) {
            body.innerHTML = '<div class="ksl-feed-modal-article">' + item.body + "</div>";
        } else {
            body.innerHTML = "<p>" + escapeHtml(item.excerpt || "") + "</p>";
        }
        var more = modal.querySelector("#kslHomeNewsMore");
        more.href = "article.html?slug=" + encodeURIComponent(item.slug);
        modal.hidden = false;
        document.documentElement.style.overflow = "hidden";
        var closeBtn = modal.querySelector(".ksl-feed-modal-close");
        if (closeBtn) closeBtn.focus();
    }

    function closeItem() {
        if (modal.hidden) return;
        modal.hidden = true;
        document.documentElement.style.overflow = "";
        if (lastCard && lastCard.focus) lastCard.focus();
    }

    modal.addEventListener("click", function (event) {
        if (event.target.closest("[data-feed-close]")) closeItem();
    });
    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") closeItem();
    });
    mount.addEventListener("click", function (event) {
        var card = event.target.closest(".ksl-feed-card");
        if (!card) return;
        var slug = card.getAttribute("data-ksl-slug");
        var item = null;
        for (var i = 0; i < items.length; i += 1) {
            if (items[i].slug === slug) item = items[i];
        }
        openItem(item, card);
    });

    fetch("data/news.json")
        .then(function (res) { return res.json(); })
        .then(function (data) {
            items = (data.items || []).slice().sort(function (a, b) {
                return String(b.date || "").localeCompare(String(a.date || ""));
            }).slice(0, 3);
            if (!items.length) {
                mount.innerHTML = '<section class="ksl-empty-state" role="status"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"></circle><path d="m15.5 15.5 5 5"></path></svg><h3>News is coming soon</h3><p>There are no published news articles yet.</p><div class="ksl-empty-state-actions"><a class="btn btn-outline-primary" href="contact.html">Contact us</a></div></section>';
                return;
            }
            mount.innerHTML = items.map(feedCard).join("");
        })
        .catch(function () {
            mount.innerHTML = '<section class="ksl-empty-state" role="status"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"></circle><path d="m15.5 15.5 5 5"></path></svg><h3>News is unavailable</h3><p>Check your connection, then try again.</p><div class="ksl-empty-state-actions"><a class="btn btn-primary" href="news.html">Open newsroom</a></div></section>';
        });
})();

(function () {
    var explorer = document.querySelector(".ksl-yard-explorer");
    if (!explorer) return;
    var pins = explorer.querySelectorAll(".ksl-map-pin");
    var counties = explorer.querySelectorAll(".ksl-map-county");
    var details = explorer.querySelectorAll(".ksl-yard-detail");
    var toggles = explorer.querySelectorAll(".ksl-yard-sat-toggle");
    var sat = document.querySelector(".ksl-yard-sat");
    var satFrame = sat && sat.querySelector("iframe");
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    var current = "mombasa";

    function bySite(list, site) {
        return Array.prototype.filter.call(list, function (el) {
            return el.getAttribute("data-site") === site;
        })[0];
    }

    function satOpen() {
        return sat && sat.classList.contains("is-open");
    }

    function syncSat() {
        var toggle = bySite(details, current).querySelector(".ksl-yard-sat-toggle");
        if (satOpen() && satFrame.getAttribute("src") !== toggle.getAttribute("data-embed")) {
            satFrame.setAttribute("src", toggle.getAttribute("data-embed"));
        }
        toggles.forEach(function (btn) {
            btn.setAttribute("aria-expanded", satOpen() ? "true" : "false");
        });
    }

    function showSat(open) {
        if (!sat) return;
        sat.classList.toggle("is-open", open);
        syncSat();
        if (open) {
            setTimeout(function () {
                var box = sat.getBoundingClientRect();
                if (box.bottom > window.innerHeight) {
                    sat.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "end" });
                }
            }, 350);
        }
    }

    function select(site) {
        current = site;
        pins.forEach(function (pin) {
            var on = pin.getAttribute("data-site") === site;
            pin.classList.toggle("is-active", on);
            pin.setAttribute("aria-pressed", on ? "true" : "false");
        });
        counties.forEach(function (county) {
            county.classList.toggle("is-active", county.getAttribute("data-site") === site);
        });
        details.forEach(function (detail) {
            detail.hidden = detail.getAttribute("data-site") !== site;
        });
        syncSat();
    }

    counties.forEach(function (county) {
        county.addEventListener("click", function () {
            select(county.getAttribute("data-site"));
        });
    });

    pins.forEach(function (pin, i) {
        pin.addEventListener("click", function () {
            select(pin.getAttribute("data-site"));
        });
        pin.addEventListener("keydown", function (event) {
            var step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
            if (!step) return;
            event.preventDefault();
            var next = pins[(i + step + pins.length) % pins.length];
            next.focus();
            select(next.getAttribute("data-site"));
        });
    });

    toggles.forEach(function (btn) {
        btn.addEventListener("click", function () { showSat(!satOpen()); });
    });

    if (sat) {
        sat.querySelector(".ksl-yard-sat-close").addEventListener("click", function () {
            showSat(false);
            var btn = bySite(details, current).querySelector(".ksl-yard-sat-toggle");
            if (btn) btn.focus();
        });
    }

    select(current);
})();
