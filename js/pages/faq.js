(function () {
    "use strict";

    var root = document.getElementById("ksl-faq-root");
    var search = document.getElementById("ksl-faq-search");
    if (!root) {
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

    function answerHtml(text) {
        return escapeHtml(text).replace(/\r?\n/g, "<br>");
    }

    function render(groups, filter) {
        var q = (filter || "").toLowerCase();
        var html = "";
        groups.forEach(function (rawGroup) {
            var group = {
                id: String(rawGroup.id || "").replace(/[^\w-]/g, ""),
                title: rawGroup.title,
                items: rawGroup.items || []
            };
            var items = group.items.filter(function (item) {
                if (!q) {
                    return true;
                }
                return (item.q + " " + item.a).toLowerCase().indexOf(q) !== -1;
            });
            if (!items.length) {
                return;
            }
            html += '<section class="ksl-faq-group" id="faq-' + group.id + '" aria-labelledby="faq-' + group.id + '-title">';
            html += '<h2 class="h4 mb-3" id="faq-' + group.id + '-title">' + escapeHtml(group.title) + "</h2>";
            html += '<div class="accordion" id="faq-' + group.id + '-acc">';
            items.forEach(function (item, idx) {
                var cid = group.id + "-" + idx;
                var open = group.id === "general" && idx === 0 ? " show" : "";
                var collapsed = open ? "" : " collapsed";
                html +=
                    '<div class="accordion-item">' +
                    '<h3 class="accordion-header" id="h-' + cid + '">' +
                    '<button class="accordion-button' + collapsed + '" type="button" data-bs-toggle="collapse" data-bs-target="#c-' + cid + '">' + escapeHtml(item.q) + "</button></h3>" +
                    '<div id="c-' + cid + '" class="accordion-collapse collapse' + open + '" data-bs-parent="#faq-' + group.id + '-acc">' +
                    '<div class="accordion-body">' + answerHtml(item.a);
                if (group.id === "complaints") {
                    html += ' <a href="downloads.html#dl-complaints">Download complaint form</a>.';
                }
                html += "</div></div></div>";
            });
            html += "</div></section>";
        });
        root.innerHTML = html || (
            '<section class="ksl-empty-state" role="status">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"></circle><path d="m15.5 15.5 5 5"></path></svg>' +
            "<h3>No matching questions</h3>" +
            "<p>Try another keyword or browse the full FAQ.</p>" +
            '<div class="ksl-empty-state-actions"><button class="btn btn-primary" type="button" data-faq-clear>Clear search</button></div>' +
            "</section>"
        );
    }

    (window.KSL_CONTENT
        ? window.KSL_CONTENT.fetchJson("/api/public/faq", "data/faq.json")
        : fetch("data/faq.json").then(function (res) { return res.json(); }))
        .then(function (data) {
            if (!data) {
                return;
            }
            var groups = data.groups || [];
            render(groups, "");
            if (search) {
                search.addEventListener("input", function () {
                    render(groups, search.value.trim());
                });
            }
            root.addEventListener("click", function (event) {
                if (!event.target.closest("[data-faq-clear]") || !search) {
                    return;
                }
                search.value = "";
                render(groups, "");
                search.focus();
            });
        })
        .catch(function () {
            root.innerHTML =
                '<section class="ksl-empty-state" role="status">' +
                '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"></circle><path d="m15.5 15.5 5 5"></path></svg>' +
                "<h3>Questions are unavailable</h3>" +
                "<p>Check your connection, then try again.</p>" +
                '<div class="ksl-empty-state-actions"><button class="btn btn-primary" type="button" onclick="window.location.reload()">Try again</button></div>' +
                "</section>";
        });
})();
