(function () {
    "use strict";

    var params = new URLSearchParams(window.location.search);
    var slug = params.get("slug") || "future-shipbuilding-kenya";
    var main = document.getElementById("ksl-article-main");
    if (!main) {
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
            var item = (data.items || []).find(function (i) { return i.slug === slug; });
            if (!item) {
                main.innerHTML = "<p>Article not found. <a href=\"news.html\">Back to news</a></p>";
                return;
            }
            document.title = item.title + " – Kenya Shipyards Limited";
            var desc = document.querySelector('meta[name="description"]');
            if (desc) {
                desc.setAttribute("content", item.excerpt);
            }
            var og = document.querySelector('meta[property="og:title"]');
            if (!og) {
                og = document.createElement("meta");
                og.setAttribute("property", "og:title");
                document.head.appendChild(og);
            }
            og.setAttribute("content", item.title);
            var ogImg = document.querySelector('meta[property="og:image"]');
            if (!ogImg) {
                ogImg = document.createElement("meta");
                ogImg.setAttribute("property", "og:image");
                document.head.appendChild(ogImg);
            }
            ogImg.setAttribute("content", item.image);

            var body = item.body;
            if (!body) {
                body =
                    "<p>" + item.excerpt + "</p>" +
                    "<p>Read more stories on the <a href=\"news.html\">News &amp; Events</a> page or contact <a href=\"mailto:publicaffairs@kenyashipyards.co.ke\">public affairs</a> for official statements.</p>";
            }
            main.innerHTML =
                '<p class="text-muted">' + formatDate(item.date) + " · " + item.category + "</p>" +
                "<h2 class=\"h3 mb-4\">" + item.title + "</h2>" +
                body;
        });
})();
