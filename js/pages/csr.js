/* Community programmes. */
(function () {
    "use strict";

    var page = document.querySelector(".ksl-impact-page");
    if (!page || !window.KSL_CONTENT) {
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
        if (/^(https?:)?\/\//i.test(url) || /^[\w./#?=&%-]+$/.test(url)) {
            return url;
        }
        return "";
    }

    function render(data) {
        var hero = page.querySelector(".about-page-hero");
        if (hero && data.title) {
            var text = hero.querySelector(".col-lg-6");
            if (text) {
                text.innerHTML =
                    (data.kicker ? '<p class="org-kicker mb-2">' + escapeHtml(data.kicker) + "</p>" : "") +
                    "<h2>" + escapeHtml(data.title) + "</h2>" +
                    (data.tagline ? '<p class="text-primary fw-semibold">' + escapeHtml(data.tagline) + "</p>" : "") +
                    (data.intro ? '<p class="mb-0">' + escapeHtml(data.intro) + "</p>" : "") +
                    ((data.badges || []).length
                        ? '<div class="about-page-badges mt-4">' + data.badges.map(function (b) {
                            return "<span>" + escapeHtml(b) + "</span>";
                        }).join("") + "</div>"
                        : "");
            }
            var media = hero.querySelector(".about-page-media");
            if (media && (data.heroImages || []).length) {
                media.innerHTML = data.heroImages.slice(0, 3).map(function (img) {
                    return '<figure><img src="' + escapeHtml(safeUrl(img.src)) + '" alt="' + escapeHtml(img.alt) + '" loading="lazy" decoding="async"></figure>';
                }).join("");
            }
        }

        var stats = page.querySelector(".board-highlights");
        if (stats && (data.stats || []).length) {
            stats.innerHTML = data.stats.map(function (s) {
                return '<div class="col-6 col-md-3"><div class="board-highlight"><strong>' + escapeHtml(s.value) + "</strong><span>" + escapeHtml(s.label) + "</span></div></div>";
            }).join("");
        }

        var footnote = page.querySelector(".ksl-impact-footnote");
        if (footnote && data.footnote) {
            footnote.innerHTML = escapeHtml(data.footnote).replace(
                "Sustainability",
                '<a href="sustainability.html">Sustainability</a>'
            );
        }

        var grid = page.querySelector(".ksl-impact-grid");
        var programmes = data.programmes || [];
        if (grid && programmes.length) {
            var section = grid.closest("section");
            if (section) {
                var h2 = section.querySelector("h2");
                var lead = section.querySelector(".ksl-learn-lead");
                if (h2 && data.programmesTitle) h2.textContent = data.programmesTitle;
                if (lead && data.programmesIntro) lead.textContent = data.programmesIntro;
            }
            grid.innerHTML = programmes.map(function (p) {
                return (
                    '<div class="col-md-6 col-lg-4 ksl-reveal is-visible"><article class="ksl-impact-card h-100">' +
                    (p.image
                        ? '<figure class="ksl-impact-card-media"><img src="' + escapeHtml(safeUrl(p.image)) + '" alt="' + escapeHtml(p.imageAlt || p.title) + '" loading="lazy" decoding="async"></figure>'
                        : "") +
                    '<div class="ksl-impact-card-body"><h3>' + escapeHtml(p.title) + "</h3>" +
                    (p.summary ? "<p>" + escapeHtml(p.summary) + "</p>" : "") +
                    "</div></article></div>"
                );
            }).join("");
        }
    }

    window.KSL_CONTENT.fetchJson("/api/public/csr", "data/csr.json").then(function (data) {
        if (data) render(data);
        if (window.KSL_LIVE) window.KSL_LIVE.show("[data-ksl-await='page']");
    }).catch(function () {
        if (window.KSL_LIVE) window.KSL_LIVE.show("[data-ksl-await='page']");
    });
})();
