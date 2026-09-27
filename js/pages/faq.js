(function () {
    "use strict";

    var root = document.getElementById("ksl-faq-root");
    var search = document.getElementById("ksl-faq-search");
    if (!root) {
        return;
    }

    function render(groups, filter) {
        var q = (filter || "").toLowerCase();
        var html = "";
        groups.forEach(function (group) {
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
            html += '<h2 class="h4 mb-3" id="faq-' + group.id + '-title">' + group.title + "</h2>";
            html += '<div class="accordion" id="faq-' + group.id + '-acc">';
            items.forEach(function (item, idx) {
                var cid = group.id + "-" + idx;
                var open = group.id === "general" && idx === 0 ? " show" : "";
                var collapsed = open ? "" : " collapsed";
                html +=
                    '<div class="accordion-item">' +
                    '<h3 class="accordion-header" id="h-' + cid + '">' +
                    '<button class="accordion-button' + collapsed + '" type="button" data-bs-toggle="collapse" data-bs-target="#c-' + cid + '">' + item.q + "</button></h3>" +
                    '<div id="c-' + cid + '" class="accordion-collapse collapse' + open + '" data-bs-parent="#faq-' + group.id + '-acc">' +
                    '<div class="accordion-body">' + item.a;
                if (group.id === "complaints") {
                    html += ' <a href="downloads.html#dl-complaints">Download complaint form</a>.';
                }
                html += "</div></div></div>";
            });
            html += "</div></section>";
        });
        root.innerHTML = html || '<p class="mb-0">No questions match your search.</p>';
    }

    fetch("data/faq.json")
        .then(function (res) { return res.json(); })
        .then(function (data) {
            var groups = data.groups || [];
            render(groups, "");
            if (search) {
                search.addEventListener("input", function () {
                    render(groups, search.value.trim());
                });
            }
        });
})();
