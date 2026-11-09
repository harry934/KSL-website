/* Projects page. The cards on the page stay in place if this cannot load. */
(function () {
    "use strict";

    var root = document.querySelector("main.ksl-projects");
    if (!root || !window.KSL_CONTENT) return;

    var MORE_ICON =
        '<i aria-hidden="true"><svg viewBox="0 0 48 48">' +
        '<g class="ksl-yard">' +
        '<path d="M8 30h32l-4 8H12z"/>' +
        '<path d="M16 30V18h8l8 8h4v4"/>' +
        '<path class="ksl-yard-mast" d="M20 18V12h6"/>' +
        "</g></svg></i>";

    function escapeHtml(value) {
        return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }

    function safeUrl(value) {
        var url = String(value || "").trim();
        if (/^(https?:)?\/\//i.test(url) || /^[\w./#?=&%-]+$/.test(url)) return url;
        return "";
    }

    function detailsHtml(text) {
        return String(text || "")
            .trim()
            .split(/\n{2,}/)
            .map(function (block) {
                return "<p>" + escapeHtml(block).replace(/\n/g, "<br>") + "</p>";
            })
            .join("");
    }

    var GROUP_ICONS = {
        "ship-construction": '<path d="M8 30h32l-4 8H12z"/><path d="M16 30V18h8l8 8h4v4"/><path d="M20 18V12h6"/>',
        maintenance: '<path d="M5 29h38l-5 9H10z"/><path d="M13 29v-6h12v6"/><path d="M17 23v-4h5"/><path d="M11 42h8M29 42h8M14 38v4M34 38v4"/><g transform="translate(27 25) rotate(-45) scale(.6)"><path stroke-width="2.8" d="M28.5-2.4A6 6 0 0 1 39.58-2.2H34v4.4h5.58A6 6 0 0 1 28.5 2.4H2.4a2.4 2.4 0 0 1 0-4.8z"/></g>',
        "civil-works": '<path d="M6 36V16l8 6V16l8 6V14l14 8v14H6z"/><path d="M14 36v-6M22 36v-6M30 36v-6"/>',
        "heavy-engineering": '<path d="m30 14 6-6 6 6-6 6"/><path d="M8 40 28 20"/><path d="m16 28 6 6"/>'
    };

    var GENERIC_ICON = '<rect x="8" y="10" width="32" height="26" rx="2"/><path d="M8 18h32M18 10v26"/>';

    var GROUP_COPY = {
        "ship-construction": ["Ship construction", "New vessels built for the Kenya Navy, counties, and other clients."],
        maintenance: ["Maintenance, repair and overhaul", "Vessels refitted, docked, or returned to service."],
        "civil-works": ["Civil and modular works", "Piers, landing sites, linkspans, and yard works."],
        "heavy-engineering": ["Heavy engineering", "Work beyond the waterline, including locomotives and heavy plant."]
    };

    var go = '<svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>';
    var projectBySlug = {};
    var modalEl = document.getElementById("kslProjectModal");
    var modalInstance = null;

    function groupKey(item) {
        var key = String(item.category || "ship-construction").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
        return key || "ship-construction";
    }

    function card(item) {
        var image = safeUrl(item.image);
        var title = escapeHtml(item.title);
        var details = String(item.details || "").trim();
        var more = details
            ? '<button type="button" class="ksl-project-action ksl-project-more" data-project-more="' + escapeHtml(item.slug || "") + '">' +
              "<span>Read more</span>" + MORE_ICON + "</button>"
            : "";
        return (
            '<article class="ksl-project">' +
            (image
                ? '<a class="ksl-project-photo" href="' + escapeHtml(image) + '" data-lightbox="projects" data-title="' + title + '">' +
                  '<img src="' + escapeHtml(image) + '" alt="' + title + '"></a>'
                : "") +
            "<div><h3>" + title + "</h3><p>" + escapeHtml(item.subtitle || "") + "</p>" +
            '<div class="ksl-project-actions">' +
            '<a class="ksl-project-action" href="contact.html">Enquire</a>' +
            more +
            "</div></div></article>"
        );
    }

    function openProject(slug) {
        var item = projectBySlug[slug];
        if (!item || !modalEl || !window.bootstrap || !window.bootstrap.Modal) return;
        var title = document.getElementById("kslProjectModalTitle");
        var summary = document.getElementById("kslProjectModalSummary");
        var body = document.getElementById("kslProjectModalBody");
        var img = document.getElementById("kslProjectModalImg");
        var media = document.getElementById("kslProjectModalMedia");
        var kicker = document.getElementById("kslProjectModalKicker");
        if (title) title.textContent = item.title || "";
        if (summary) {
            summary.textContent = item.subtitle || "";
            summary.hidden = !item.subtitle;
        }
        if (kicker) kicker.textContent = item.categoryLabel || "Our projects";
        if (body) body.innerHTML = detailsHtml(item.details);
        if (img && media) {
            var image = safeUrl(item.image);
            if (image) {
                img.src = image;
                img.alt = item.title || "";
                media.hidden = false;
            } else {
                img.removeAttribute("src");
                img.alt = "";
                media.hidden = true;
            }
        }
        if (!modalInstance) modalInstance = new window.bootstrap.Modal(modalEl);
        modalInstance.show();
    }

    function render(data) {
        if (!data) return;
        var items = (data && data.items) || [];
        projectBySlug = {};
        items.forEach(function (item) {
            if (item && item.slug) projectBySlug[item.slug] = item;
        });
        var list = root.querySelector(".ksl-svc-tabs");
        var host = list && list.parentElement;
        if (!list || !host) return;
        var order = [];
        var groups = {};
        items.forEach(function (item) {
            var key = groupKey(item);
            if (!groups[key]) {
                groups[key] = { label: item.categoryLabel || item.category || "Projects", items: [] };
                order.push(key);
            }
            groups[key].items.push(item);
        });
        var preferred = ["ship-construction", "maintenance", "civil-works", "heavy-engineering"];
        var saved = ((data && data.groupOrder) || []).map(function (name) { return groupKey({ category: name }); });
        order.sort(function (a, b) {
            var ia = saved.indexOf(a);
            var ib = saved.indexOf(b);
            if (ia === -1) ia = saved.length + (preferred.indexOf(a) === -1 ? 100 : preferred.indexOf(a));
            if (ib === -1) ib = saved.length + (preferred.indexOf(b) === -1 ? 100 : preferred.indexOf(b));
            return ia - ib;
        });
        if (!order.length) return;
        host.querySelectorAll(".ksl-svc-panel").forEach(function (panel) { panel.remove(); });
        list.innerHTML = order.map(function (key, index) {
            var group = groups[key];
            var total = group.items.length;
            return '<button type="button" class="ksl-svc-tab" role="tab" id="tab-' + key + '" aria-controls="' + key + '" aria-selected="' + (index === 0 ? "true" : "false") + '"' + (index === 0 ? "" : ' tabindex="-1"') + '>' +
                '<span class="ksl-svc-tab-ico"><svg viewBox="0 0 48 48" aria-hidden="true">' + (GROUP_ICONS[key] || GENERIC_ICON) + "</svg></span>" +
                '<span class="ksl-svc-tab-name">' + escapeHtml(group.label) + "</span>" +
                '<span class="ksl-svc-tab-foot"><span class="ksl-svc-tab-count">' + total + (total === 1 ? " project" : " projects") + '</span><span class="ksl-svc-tab-go" aria-hidden="true">' + go + "</span></span>" +
                "</button>";
        }).join("");
        order.forEach(function (key, index) {
            var group = groups[key];
            var copy = GROUP_COPY[key];
            var title = copy ? copy[0] : group.label;
            var blurb = copy ? copy[1] : "";
            var section = document.createElement("section");
            section.id = key;
            section.className = "ksl-project-group ksl-svc-panel";
            section.setAttribute("role", "tabpanel");
            section.setAttribute("aria-labelledby", "tab-" + key);
            if (index !== 0) section.hidden = true;
            section.innerHTML = "<header><h2>" + escapeHtml(title) + "</h2>" + (blurb ? "<p>" + escapeHtml(blurb) + "</p>" : "") + '</header><div class="ksl-project-grid">' + group.items.map(card).join("") + "</div>";
            host.appendChild(section);
        });
        if (window.kslBindServiceTabs) window.kslBindServiceTabs();
    }

    root.addEventListener("click", function (event) {
        var btn = event.target.closest("[data-project-more]");
        if (!btn) return;
        event.preventDefault();
        openProject(btn.getAttribute("data-project-more") || "");
    });

    window.KSL_CONTENT.fetchJson("/api/public/projects", "data/projects.json").then(function (data) {
        render(data);
        if (window.KSL_LIVE) window.KSL_LIVE.show("[data-ksl-await='page']");
    }).catch(function () {
        if (window.KSL_LIVE) window.KSL_LIVE.show("[data-ksl-await='page']");
    });
})();
