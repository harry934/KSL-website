/* One news story. */
(function () {
    "use strict";

    var page = document.getElementById("ksl-article");
    var main = document.getElementById("ksl-article-main");
    if (!page || !main) {
        return;
    }

    var params = new URLSearchParams(window.location.search);
    var slug = params.get("slug") || "future-shipbuilding-kenya";
    function byId(id) {
        return document.getElementById(id);
    }

    function formatDate(iso) {
        try {
            return new Date(iso + "T12:00:00").toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" });
        } catch (e) {
            return iso;
        }
    }

    function escapeHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function articleHref(item) {
        return "article.html?slug=" + encodeURIComponent(item.slug);
    }

    function readMinutes(html) {
        var words = String(html).replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
        return Math.max(1, Math.round(words / 200));
    }

    function setMeta(selector, attr, key, value) {
        var tag = document.querySelector(selector);
        if (!tag) {
            tag = document.createElement("meta");
            tag.setAttribute(attr, key);
            document.head.appendChild(tag);
        }
        tag.setAttribute("content", value);
    }

    function storyCard(item) {
        return (
            '<a class="ksl-story-card" href="' + articleHref(item) + '">' +
            '<span class="ksl-story-photo"><img src="' + escapeHtml(item.image) + '" alt="" loading="lazy" decoding="async"></span>' +
            '<span class="ksl-story-body">' +
            '<span class="ksl-story-kicker">' + escapeHtml(item.category || "News") + (item.location ? " \u00b7 " + escapeHtml(item.location) : "") + "</span>" +
            '<span class="ksl-story-title">' + escapeHtml(item.title) + "</span>" +
            (item.excerpt ? '<span class="ksl-story-excerpt">' + escapeHtml(item.excerpt) + "</span>" : "") +
            '<time datetime="' + escapeHtml(item.date) + '">' + escapeHtml(formatDate(item.date)) + "</time>" +
            "</span></a>"
        );
    }

    function storyLink(item, label, dir) {
        if (!item) {
            return "<span></span>";
        }
        return (
            '<a class="ksl-article-step is-' + dir + '" href="' + articleHref(item) + '">' +
            '<img src="' + escapeHtml(item.image) + '" alt="" loading="lazy" decoding="async">' +
            '<span class="ksl-article-step-text">' +
            '<span class="ksl-article-step-label">' + label + "</span>" +
            '<span class="ksl-article-step-title">' + escapeHtml(item.title) + "</span></span></a>"
        );
    }

    function renderShare(item) {
        var url = window.location.href;
        var text = item.title + " | Kenya Shipyards Limited";
        var targets = {
            facebook: "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(url),
            x: "https://x.com/intent/post?url=" + encodeURIComponent(url) + "&text=" + encodeURIComponent(text),
            linkedin: "https://www.linkedin.com/sharing/share-offsite/?url=" + encodeURIComponent(url),
            whatsapp: "https://wa.me/?text=" + encodeURIComponent(text + " " + url)
        };
        document.querySelectorAll(".ksl-article-share a[data-share]").forEach(function (link) {
            link.href = targets[link.getAttribute("data-share")] || "#";
        });
    }

    function renderNotFound() {
        page.classList.remove("is-loading");
        page.classList.add("is-missing");
        byId("kslArticleTitle").textContent = "We couldn't find that story";
        byId("kslArticleDek").textContent = "It may have moved or been retired. The newsroom has every current story.";
        byId("kslArticleKicker").textContent = "Newsroom";
        byId("kslArticleMeta").textContent = "";
        main.innerHTML = '<p><a class="btn btn-primary" href="news.html">Go to News and Events</a></p>';
    }

    function render(item, all) {
        var sorted = all.slice().sort(function (a, b) {
            return String(b.date || "").localeCompare(String(a.date || ""));
        });
        var index = sorted.indexOf(item);
        var newer = index > 0 ? sorted[index - 1] : null;
        var older = index < sorted.length - 1 ? sorted[index + 1] : null;
        var others = sorted.filter(function (other) {
            return other !== item && other !== newer && other !== older;
        });

        document.title = item.title + " | Kenya Shipyards Limited";
        setMeta('meta[name="description"]', "name", "description", item.excerpt || item.title);
        setMeta('meta[property="og:title"]', "property", "og:title", item.title);
        setMeta('meta[property="og:image"]', "property", "og:image", item.image || "");

        var cover = byId("kslArticleCover");
        cover.src = item.image || "img/ksl/yard.jpg";
        if (!item.image) cover.setAttribute("data-ksl-image", "content.missing-photo");
        cover.alt = item.title;
        byId("kslArticleKicker").textContent = item.category || "News";
        byId("kslArticleTitle").textContent = item.title;
        byId("kslArticleCrumb").textContent = item.title;
        byId("kslArticleAuthor").textContent = item.author || "KSL Communications";

        var body = item.body;
        var isBrief = !body;
        var plain = function (html) {
            return String(html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
        };
        var repeatsLead = plain(body).indexOf(plain(item.excerpt)) === 0;
        byId("kslArticleDek").textContent = isBrief || repeatsLead ? "" : (item.excerpt || "");
        if (isBrief) {
            body = "<p>" + escapeHtml(item.excerpt || "") + "</p>";
        }
        byId("kslArticleMeta").innerHTML =
            '<time datetime="' + escapeHtml(item.date) + '">' + escapeHtml(formatDate(item.date)) + "</time>" +
            '<span aria-hidden="true">·</span>' + readMinutes(body) + " min read";

        var figure = isBrief && item.image
            ? '<figure class="ksl-article-figure"><img src="' + escapeHtml(item.image) + '" alt="' + escapeHtml(item.title) + '">' +
              "<figcaption>" + escapeHtml(item.title) + ". <span>Photo: Kenya Shipyards Limited</span></figcaption></figure>"
            : "";
        main.innerHTML =
            '<div class="ksl-article-prose' + (isBrief ? " is-brief" : "") + '">' + body + figure + "</div>" +
            (isBrief
                ? '<aside class="ksl-article-note"><strong>Press brief.</strong> For the full statement, photographs or interviews, contact Public Affairs at <a href="mailto:publicaffairs@kenyashipyards.co.ke?subject=' + encodeURIComponent("Media enquiry: " + item.title) + '">publicaffairs@kenyashipyards.co.ke</a>.</aside>'
                : "") +
            '<footer class="ksl-article-foot">' +
            (item.updated ? '<p class="ksl-article-updated">Updated <time datetime="' + escapeHtml(item.updated) + '">' + escapeHtml(formatDate(item.updated)) + "</time></p>" : "") +
            '<p class="ksl-article-tags"><span>Filed under</span><a href="news.html">' + escapeHtml(item.category || "News") + "</a></p>" +
            '<nav class="ksl-article-steps" aria-label="Previous and next stories">' + storyLink(older, "Previous story", "prev") + storyLink(newer, "Next story", "next") + "</nav>" +
            "</footer>";

        var lead = main.querySelector(".ksl-article-prose > p");
        if (lead) {
            var dateline = document.createElement("span");
            dateline.className = "ksl-article-dateline";
            dateline.textContent = (item.location || "Nairobi") + ", " + formatDate(item.date) + " \u2014 ";
            lead.insertBefore(dateline, lead.firstChild);
        }

        var more = byId("kslArticleMore");
        if (others.length) {
            var picks = others.slice(0, 3);
            more.innerHTML = picks.map(storyCard).join("");
            more.classList.toggle("is-pair", picks.length === 2);
            more.classList.toggle("is-single", picks.length === 1);
        } else {
            more.closest(".ksl-article-more").hidden = true;
        }

        renderShare(item);
        page.classList.remove("is-loading");
    }

    (window.KSL_CONTENT ? window.KSL_CONTENT.fetchJson("/api/public/news", "data/news.json") : fetch("data/news.json").then(function (res) { return res.json(); }))
        .then(function (data) {
            if (!data) {
                renderNotFound();
                return;
            }
            var items = data.items || [];
            var item = items.filter(function (i) { return i.slug === slug; })[0];
            if (item) {
                render(item, items);
            } else {
                renderNotFound();
            }
        })
        .catch(renderNotFound);

    var copyBtn = document.querySelector('.ksl-article-share [data-share="copy"]');
    var copied = document.querySelector(".ksl-article-copied");
    if (copyBtn) {
        copyBtn.addEventListener("click", function () {
            var done = function () {
                copied.textContent = "Link copied";
                copyBtn.classList.add("is-done");
                window.setTimeout(function () {
                    copied.textContent = "";
                    copyBtn.classList.remove("is-done");
                }, 2200);
            };
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(window.location.href).then(done, function () {
                    window.prompt("Copy this link", window.location.href);
                });
            } else {
                window.prompt("Copy this link", window.location.href);
            }
        });
    }

    // No mailing-list backend yet: subscriptions are sent to Public Affairs by email.
    var form = document.querySelector(".ksl-newsletter-form");
    if (form) {
        var email = form.querySelector('input[type="email"]');
        var msg = form.querySelector(".ksl-newsletter-msg");
        form.addEventListener("submit", function (event) {
            event.preventDefault();
            var value = email.value.trim();
            if (!value || !email.checkValidity()) {
                email.classList.add("is-invalid");
                msg.className = "ksl-newsletter-msg is-error";
                msg.textContent = "Enter a valid email address.";
                email.focus();
                return;
            }
            email.classList.remove("is-invalid");
            var body = "Please add me to the KSL newsletter.\n\nEmail: " + value;
            window.location.href = "mailto:publicaffairs@kenyashipyards.co.ke?subject=" +
                encodeURIComponent("Newsletter subscription") + "&body=" + encodeURIComponent(body);
            msg.className = "ksl-newsletter-msg is-ok";
            msg.textContent = "Almost done: send the email that just opened to confirm.";
            form.classList.add("is-sent");
        });
        email.addEventListener("input", function () {
            email.classList.remove("is-invalid");
            if (msg.classList.contains("is-error")) {
                msg.textContent = "";
            }
        });
    }
})();
