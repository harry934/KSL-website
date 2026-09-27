(function () {
    "use strict";

    var mount = document.getElementById("ksl-home-news-grid");
    if (!mount) {
        return;
    }

    function formatDate(iso) {
        try {
            return new Date(iso + "T12:00:00").toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" });
        } catch (e) {
            return iso;
        }
    }

    fetch("data/news.json")
        .then(function (res) { return res.json(); })
        .then(function (data) {
            var items = (data.items || []).slice(0, 4);
            mount.innerHTML = items.map(function (item) {
                var href = "article.html?slug=" + encodeURIComponent(item.slug);
                return (
                    '<article class="news-card news-row wow fadeInUp ksl-lift-card mb-4">' +
                    '<a class="news-cover" href="' + href + '"><img src="' + item.image + '" alt="" loading="lazy" decoding="async"></a>' +
                    '<div class="news-card-body">' +
                    '<p class="news-kicker">' + item.category + "</p>" +
                    "<h3><a href=\"" + href + "\">" + item.title + "</a></h3>" +
                    '<p class="news-meta">' + formatDate(item.date) + "</p>" +
                    "<p>" + item.excerpt + "</p>" +
                    "</div></article>"
                );
            }).join("");
        });
})();
