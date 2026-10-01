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
            if (!items.length) {
                mount.innerHTML = '<section class="ksl-empty-state" role="status"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"></circle><path d="m15.5 15.5 5 5"></path></svg><h3>News is coming soon</h3><p>There are no published news articles yet.</p><div class="ksl-empty-state-actions"><a class="btn btn-outline-primary" href="contact.html">Contact us</a></div></section>';
                return;
            }
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
        })
        .catch(function () {
            mount.innerHTML = '<section class="ksl-empty-state" role="status"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"></circle><path d="m15.5 15.5 5 5"></path></svg><h3>News is unavailable</h3><p>Check your connection, then try again.</p><div class="ksl-empty-state-actions"><a class="btn btn-primary" href="news.html">Open newsroom</a></div></section>';
        });
})();
