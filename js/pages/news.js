(function () {
    "use strict";

    function formatDate(iso) {
        try {
            return new Date(iso + "T12:00:00").toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" });
        } catch (e) {
            return iso;
        }
    }

    function card(item) {
        var href = "article.html?slug=" + encodeURIComponent(item.slug);
        return (
            '<article class="news-card news-row ksl-lift-card mb-4">' +
            '<a class="news-cover" href="' + href + '"><img src="' + item.image + '" alt="" loading="lazy" decoding="async"></a>' +
            '<div class="news-card-body">' +
            '<p class="news-kicker">' + item.category + "</p>" +
            "<h3><a href=\"" + href + "\">" + item.title + "</a></h3>" +
            '<p class="news-meta">' + formatDate(item.date) + " · " + item.author + "</p>" +
            "<p>" + item.excerpt + "</p>" +
            '<a class="btn btn-outline-gold" href="' + href + '">Read article</a>' +
            "</div></article>"
        );
    }

    var list = document.getElementById("newsList");
    if (list) {
        fetch("data/news.json")
            .then(function (res) { return res.json(); })
            .then(function (data) {
                var items = data.items || [];
                var note = document.getElementById("searchNote");
                var grid = document.createElement("div");
                grid.className = "ksl-news-grid";
                grid.innerHTML = items.map(card).join("");
                if (note && note.nextSibling) {
                    list.insertBefore(grid, note.nextSibling);
                } else {
                    list.appendChild(grid);
                }
                var old = list.querySelector(".news-hit");
                if (old) {
                    old.remove();
                }
            });
    }

    var press = document.getElementById("ksl-press-kit");
    if (press) {
        fetch("data/press.json")
            .then(function (res) { return res.json(); })
            .then(function (data) {
                fetch("data/downloads.json")
                    .then(function (r) { return r.json(); })
                    .then(function (dl) {
                        var links = (data.assets || []).map(function (asset) {
                            var href = asset.href;
                            if (asset.downloadId) {
                                var item = (dl.items || []).find(function (i) { return i.id === asset.downloadId; });
                                if (item) {
                                    href = dl.baseUrl + item.file;
                                }
                            }
                            return '<li><a href="' + href + '" target="_blank" rel="noopener">' + asset.title + '</a> <span class="text-muted">(' + asset.type + ')</span></li>';
                        }).join("");
                        press.innerHTML =
                            "<p>" + data.boilerplate + "</p>" +
                            "<p><strong>Media contact:</strong> <a href=\"mailto:" + data.contactEmail + "\">" + data.contactEmail + "</a> · " + data.contactPhone + "</p>" +
                            "<h3 class=\"h5 mt-4\">Press assets</h3><ul class=\"ksl-press-list\">" + links + "</ul>";
                    });
            });
    }
})();
