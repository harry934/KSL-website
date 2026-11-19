/* Paints the gallery as soon as the admin data is ready, before the heavier page scripts. */
(function () {
    "use strict";

    var galleryRoot = document.getElementById("ksl-gallery-grid");
    if (!galleryRoot || !window.KSL_CONTENT) return;
    galleryRoot.setAttribute("data-ksl-live-gallery", "1");

    var galleryFilter = "all";
    var galleryPhotos = [];

    function show() {
        if (window.KSL_LIVE) window.KSL_LIVE.show("[data-ksl-await='page']");
    }

    function photoFigure(photo) {
        var cat = photo.category || "all";
        var fig = document.createElement("figure");
        fig.className = "ksl-gallery-item";
        fig.setAttribute("data-category", cat);
        var link = document.createElement("a");
        link.href = photo.src;
        link.setAttribute("data-lightbox", "ksl-gallery");
        link.setAttribute("data-title", photo.title || "");
        var img = document.createElement("img");
        img.src = photo.src;
        img.alt = photo.alt || photo.title || "Kenya Shipyards Limited gallery";
        img.loading = "lazy";
        img.decoding = "async";
        link.appendChild(img);
        fig.appendChild(link);
        var cap = document.createElement("figcaption");
        if (photo.title) {
            var title = document.createElement("strong");
            title.textContent = photo.title;
            cap.appendChild(title);
        }
        var more = document.createElement("span");
        more.className = "ksl-gallery-more";
        more.innerHTML = 'Show More <svg viewBox="0 0 13 13" fill="none" aria-hidden="true"><path d="M8.125 1.625H11.375V4.875" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.416 7.583 11.374 1.625" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/><path d="M9.75 7.042v3.25a1.083 1.083 0 0 1-1.083 1.083H2.708a1.083 1.083 0 0 1-1.083-1.083V4.333a1.083 1.083 0 0 1 1.083-1.083h3.25" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        cap.appendChild(more);
        fig.appendChild(cap);
        return fig;
    }

    var PAGE_SIZE = 24;
    var galleryShown = 0;

    function renderGallery(reset) {
        if (reset !== false) galleryShown = 0;
        var visible = galleryPhotos.filter(function (photo) {
            var cat = photo.category || "all";
            return galleryFilter === "all" || cat === galleryFilter;
        });
        if (!visible.length) {
            galleryRoot.innerHTML = '<section class="ksl-empty-state" role="status"><h3>No photos in this category</h3><p>Try another filter or view the full gallery.</p><div class="ksl-empty-state-actions"><button class="btn btn-primary" type="button" data-gallery-all>View all photos</button></div></section>';
            return;
        }
        if (galleryShown === 0) galleryRoot.innerHTML = "";
        var next = visible.slice(galleryShown, galleryShown + PAGE_SIZE);
        next.forEach(function (photo) {
            galleryRoot.appendChild(photoFigure(photo));
        });
        galleryShown += next.length;
        var more = galleryRoot.querySelector("[data-gallery-more]");
        if (more) more.remove();
        if (galleryShown < visible.length) {
            var wrap = document.createElement("div");
            wrap.className = "ksl-empty-state-actions";
            wrap.style.gridColumn = "1 / -1";
            wrap.innerHTML = '<button class="btn btn-primary" type="button" data-gallery-more>Show more photos</button>';
            galleryRoot.appendChild(wrap);
        }
    }

    function mountPlayer(parent, video) {
        if (!parent || !video) return;
        parent.innerHTML = "";
        if (video.src) {
            var player = document.createElement("video");
            player.src = video.src;
            player.controls = true;
            player.preload = "metadata";
            player.playsInline = true;
            player.setAttribute("playsinline", "");
            player.title = video.title || "Kenya Shipyards Limited video";
            if (video.contentType) player.setAttribute("type", video.contentType);
            parent.appendChild(player);
            return;
        }
        if (!video.youtubeId) return;
        var iframe = document.createElement("iframe");
        iframe.src = "https://www.youtube.com/embed/" + video.youtubeId;
        iframe.title = video.title || "Kenya Shipyards Limited video";
        iframe.loading = "lazy";
        iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
        iframe.allowFullscreen = true;
        parent.appendChild(iframe);
    }

    function renderVideos(videos) {
        if (!videos || !videos.length) return;
        var featureMount = document.getElementById("ksl-video-feature");
        var videoMount = document.getElementById("ksl-gallery-videos");
        var featured = videos.find(function (v) { return v.featured; }) || videos[0];
        mountPlayer(featureMount, featured);
        if (!videoMount) return;
        videoMount.innerHTML = "";
        videos.filter(function (v) { return v !== featured; }).forEach(function (video) {
            var card = document.createElement("article");
            card.className = "ksl-video-card";
            var wrap = document.createElement("div");
            wrap.className = "ratio ratio-16x9";
            mountPlayer(wrap, video);
            card.appendChild(wrap);
            if (video.title) {
                var h = document.createElement("h3");
                h.textContent = video.title;
                card.appendChild(h);
            }
            if (video.caption) {
                var p = document.createElement("p");
                p.className = "ksl-video-caption";
                p.textContent = video.caption;
                card.appendChild(p);
            }
            videoMount.appendChild(card);
        });
    }

    galleryRoot.addEventListener("click", function (event) {
        if (event.target.closest("[data-gallery-more]")) {
            renderGallery(false);
            return;
        }
        if (!event.target.closest("[data-gallery-all]")) return;
        galleryFilter = "all";
        document.querySelectorAll(".ksl-gallery-filters [data-ksl-gallery-filter]").forEach(function (btn) {
            btn.classList.toggle("is-active", (btn.getAttribute("data-ksl-gallery-filter") || "all") === "all");
        });
        renderGallery(true);
    });

    document.querySelectorAll(".ksl-gallery-filters [data-ksl-gallery-filter]").forEach(function (btn) {
        btn.addEventListener("click", function () {
            document.querySelectorAll(".ksl-gallery-filters [data-ksl-gallery-filter]").forEach(function (b) {
                b.classList.remove("is-active");
            });
            btn.classList.add("is-active");
            galleryFilter = btn.getAttribute("data-ksl-gallery-filter") || "all";
            renderGallery(true);
        });
    });

    window.KSL_CONTENT.fetchJson("/api/public/gallery", "data/gallery.json").then(function (data) {
        galleryPhotos = (data && data.photos) || [];
        renderGallery(true);
        renderVideos((data && data.videos) || []);
        show();
    }).catch(function () {
        galleryRoot.innerHTML = '<section class="ksl-empty-state" role="status"><h3>Gallery is unavailable</h3><p>Check your connection, then refresh the page.</p></section>';
        show();
    });
})();
