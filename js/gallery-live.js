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
        if (photo.title) {
            var cap = document.createElement("figcaption");
            cap.textContent = photo.title;
            fig.appendChild(cap);
        }
        return fig;
    }

    function renderGallery() {
        galleryRoot.innerHTML = "";
        var visible = galleryPhotos.filter(function (photo) {
            var cat = photo.category || "all";
            return galleryFilter === "all" || cat === galleryFilter;
        });
        if (!visible.length) {
            galleryRoot.innerHTML = '<section class="ksl-empty-state" role="status"><h3>No photos in this category</h3><p>Try another filter or view the full gallery.</p><div class="ksl-empty-state-actions"><button class="btn btn-primary" type="button" data-gallery-all>View all photos</button></div></section>';
            return;
        }
        for (var i = 0; i < visible.length; i += 6) {
            var row = document.createElement("div");
            row.className = "ksl-gallery-row";
            visible.slice(i, i + 6).forEach(function (photo) {
                row.appendChild(photoFigure(photo));
            });
            galleryRoot.appendChild(row);
        }
    }

    function mountPlayer(parent, video) {
        if (!parent || !video || !video.youtubeId) return;
        parent.innerHTML = "";
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
        if (!event.target.closest("[data-gallery-all]")) return;
        galleryFilter = "all";
        document.querySelectorAll(".ksl-gallery-filters [data-ksl-gallery-filter]").forEach(function (btn) {
            btn.classList.toggle("is-active", (btn.getAttribute("data-ksl-gallery-filter") || "all") === "all");
        });
        renderGallery();
    });

    document.querySelectorAll(".ksl-gallery-filters [data-ksl-gallery-filter]").forEach(function (btn) {
        btn.addEventListener("click", function () {
            document.querySelectorAll(".ksl-gallery-filters [data-ksl-gallery-filter]").forEach(function (b) {
                b.classList.remove("is-active");
            });
            btn.classList.add("is-active");
            galleryFilter = btn.getAttribute("data-ksl-gallery-filter") || "all";
            renderGallery();
        });
    });

    window.KSL_CONTENT.fetchJson("/api/public/gallery", "data/gallery.json").then(function (data) {
        galleryPhotos = (data && data.photos) || [];
        renderGallery();
        renderVideos((data && data.videos) || []);
        show();
    }).catch(function () {
        galleryRoot.innerHTML = '<section class="ksl-empty-state" role="status"><h3>Gallery is unavailable</h3><p>Check your connection, then refresh the page.</p></section>';
        show();
    });
})();
