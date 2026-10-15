(function () {
    "use strict";

    var grid = document.querySelector(".product-grid");
    if (!grid || !window.KSL_CONTENT) {
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

    function specList(specs, className) {
        if (!specs || !specs.length) return "";
        return '<dl' + (className ? ' class="' + className + '"' : "") + ">" + specs.map(function (s) {
            return "<div><dt>" + escapeHtml(s.label) + "</dt><dd>" + escapeHtml(s.value) + "</dd></div>";
        }).join("") + "</dl>";
    }

    function card(item) {
        var id = escapeHtml(item.slug) + "-details";
        var toggle = ' data-product-toggle="' + id + '" aria-controls="' + id + '" aria-expanded="false"';
        var hasExtra = item.extraSpecs && item.extraSpecs.length;
        return (
            '<div class="col-lg-4 col-md-6 ksl-reveal is-visible" data-cat="' + escapeHtml(item.category) + '">' +
            '<article class="product-card h-100">' +
            (item.image
                ? '<button class="product-media" type="button"' + toggle + '>' +
                  '<img src="' + escapeHtml(safeUrl(item.image)) + '" alt="' + escapeHtml(item.imageAlt || item.name) + '" loading="lazy" decoding="async">' +
                  '<span class="visually-hidden">View ' + escapeHtml(item.name) + " specifications</span></button>"
                : "") +
            '<div class="product-card-body">' +
            (item.eyebrow ? '<p class="product-eyebrow">' + escapeHtml(item.eyebrow) + "</p>" : "") +
            "<h2><button type=\"button\"" + toggle + ">" + escapeHtml(item.name) + "</button></h2>" +
            specList(item.keySpecs, "product-spec-list") +
            '<div class="product-actions">' +
            (hasExtra ? '<button class="btn btn-outline-primary product-details-toggle" type="button"' + toggle + ">View details</button>" : "") +
            '<a class="btn btn-primary" href="contact.html">Enquire</a></div>' +
            (hasExtra
                ? '<div class="product-details-drawer" id="' + id + '" hidden><h3>Additional specifications</h3>' + specList(item.extraSpecs) + "</div>"
                : "") +
            "</div></article></div>"
        );
    }

    function render(data) {
        var items = data.items || [];
        if (!items.length) return;

        var intro = document.querySelector(".product-intro");
        if (intro && (data.title || data.intro)) {
            intro.innerHTML =
                (data.kicker ? '<p class="product-kicker">' + escapeHtml(data.kicker) + "</p>" : "") +
                (data.title ? "<h2>" + escapeHtml(data.title) + "</h2>" : "") +
                (data.intro ? "<p>" + escapeHtml(data.intro) + "</p>" : "");
        }

        var groups = data.rangeGroups || [];
        var filters = document.querySelector(".product-filters");
        if (filters) {
            var seen = {};
            var html = '<button type="button" class="is-on" data-filter="all" aria-pressed="true">All vessels</button>';
            items.forEach(function (item) {
                if (seen[item.category]) return;
                seen[item.category] = true;
                html += '<button type="button" data-filter="' + escapeHtml(item.category) + '" aria-pressed="false">' + escapeHtml(item.categoryLabel || item.category) + "</button>";
            });
            if (groups.length) {
                html += '<button type="button" data-filter="range" aria-pressed="false">' + escapeHtml(data.rangeKicker || "Extended range") + "</button>";
            }
            filters.innerHTML = html;
        }

        grid.innerHTML = items.map(card).join("");

        var range = document.querySelector(".product-range");
        if (range) {
            range.hidden = !groups.length;
            var heading = range.querySelector(".product-range-heading");
            if (heading) {
                var catalogue = safeUrl(data.catalogueUrl);
                heading.innerHTML =
                    "<div>" +
                    (data.rangeKicker ? '<p class="product-kicker">' + escapeHtml(data.rangeKicker) + "</p>" : "") +
                    '<h2 id="range-title">' + escapeHtml(data.rangeTitle || "") + "</h2></div>" +
                    (catalogue ? '<a class="btn btn-outline-gold" href="' + escapeHtml(catalogue) + '" target="_blank" rel="noopener">Product catalogue</a>' : "");
            }
            var rangeGrid = range.querySelector(".product-range-grid");
            if (rangeGrid) {
                rangeGrid.innerHTML = groups.map(function (g) {
                    return "<div><h3>" + escapeHtml(g.title) + "</h3><ul>" + (g.items || []).map(function (i) {
                        return "<li>" + escapeHtml(i) + "</li>";
                    }).join("") + "</ul></div>";
                }).join("");
            }
        }
    }

    window.KSL_CONTENT.fetchJson("/api/public/products", "data/products.json").then(function (data) {
        if (data) render(data);
    }).catch(function () {});
})();
