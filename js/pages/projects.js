/* Projects page. The cards on the page stay in place if this cannot load. */
(function () {
    "use strict";

    var root = document.querySelector("main.ksl-projects");
    if (!root || !window.KSL_CONTENT) return;

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

    function card(item) {
        var image = safeUrl(item.image);
        var title = escapeHtml(item.title);
        return (
            '<article class="ksl-project">' +
            (image
                ? '<a class="ksl-project-photo" href="' + escapeHtml(image) + '" data-lightbox="projects" data-title="' + title + '">' +
                  '<img src="' + escapeHtml(image) + '" alt="' + title + '"></a>'
                : "") +
            "<div><h3>" + title + "</h3><p>" + escapeHtml(item.subtitle || "") + "</p>" +
            '<a href="contact.html">Enquire</a></div></article>'
        );
    }

    function render(data) {
        var items = (data && data.items) || [];
        if (!items.length) return;
        var groups = {};
        items.forEach(function (item) {
            var key = item.category || "ship-construction";
            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
        });
        Object.keys(groups).forEach(function (key) {
            var panel = document.getElementById(key);
            var grid = panel && panel.querySelector(".ksl-project-grid");
            if (!grid) return;
            grid.innerHTML = groups[key].map(card).join("");
            var tab = document.getElementById("tab-" + key);
            var count = tab && tab.querySelector(".ksl-svc-tab-count");
            if (count) {
                var total = groups[key].length;
                count.textContent = total + (total === 1 ? " project" : " projects");
            }
        });
    }

    window.KSL_CONTENT.fetchJson("/api/public/projects", "data/projects.json").then(render).catch(function () {});
})();
