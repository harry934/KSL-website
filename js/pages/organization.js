/* Organisation page: intro, leadership, and a zoomable/pannable structure popup. */
(function () {
    "use strict";

    var mount = document.getElementById("ksl-org-extra");
    var modal = document.getElementById("kslOrgChartModal");
    var chartEl = document.querySelector("[data-org-chart]");
    var stage = document.querySelector("[data-org-stage]");
    var zoomLabel = document.querySelector("[data-org-zoom-label]");
    if (!mount || !modal || !chartEl) {
        return;
    }

    var zoom = 1;
    var MIN_ZOOM = 0.35;
    var MAX_ZOOM = 1.8;
    var ZOOM_STEP = 0.12;
    var BASE_IMG_WIDTH = 954;
    var lastFocus = null;
    var dragging = false;
    var dragMoved = false;
    var startX = 0;
    var startY = 0;
    var startLeft = 0;
    var startTop = 0;

    function fetchOrg() {
        return window.KSL_CONTENT
            ? window.KSL_CONTENT.fetchJson("/api/public/organization", "data/organization.json")
            : fetch("data/organization.json").then(function (res) { return res.json(); });
    }

    function fetchDownloads() {
        return window.KSL_CONTENT
            ? window.KSL_CONTENT.fetchJson("/api/public/downloads", "data/downloads.json")
            : fetch("data/downloads.json").then(function (res) { return res.json(); });
    }

    function paintIntro(data, esc) {
        var intro = document.querySelector(".org-intro");
        if (!intro) return;
        var block = data && data.intro ? data.intro : null;
        var kicker = block && block.kicker ? String(block.kicker).trim() : "";
        var title = block && block.title ? String(block.title).trim() : "";
        var body = block && block.body ? String(block.body).trim() : "";
        if (!kicker && !title && !body) {
            intro.innerHTML = "";
            intro.hidden = true;
            return;
        }
        intro.hidden = false;
        intro.innerHTML =
            (kicker ? '<p class="org-kicker">' + esc(kicker) + "</p>" : "") +
            (title ? '<h2 id="organization-title">' + esc(title) + "</h2>" : "") +
            (body ? "<p>" + esc(body) + "</p>" : "");
    }

    function paintChart() {
        chartEl.innerHTML = '<div class="org-tree"><img class="org-chart-image" src="img/ksl/organogram.png" alt="Organisation structure, from the Board and the Managing Director through the departments"></div>';
        var img = chartEl.querySelector("img");
        if (img) {
            img.addEventListener("load", function () {
                if (!modal.hidden) fitChart();
            });
        }
    }

    function chartImage() {
        return chartEl.querySelector(".org-chart-image");
    }

    function chartChromeSize(imgWidth, imgHeight) {
        var style = window.getComputedStyle(chartEl);
        var extraX =
            parseFloat(style.paddingLeft) +
            parseFloat(style.paddingRight) +
            parseFloat(style.borderLeftWidth) +
            parseFloat(style.borderRightWidth);
        var extraY =
            parseFloat(style.paddingTop) +
            parseFloat(style.paddingBottom) +
            parseFloat(style.borderTopWidth) +
            parseFloat(style.borderBottomWidth);
        return {
            width: imgWidth + extraX,
            height: imgHeight + extraY,
        };
    }

    function setImageZoom(level) {
        var img = chartImage();
        if (!img) return;
        chartEl.style.transform = "";
        chartEl.style.transformOrigin = "";
        img.style.width = Math.round(BASE_IMG_WIDTH * level) + "px";
        img.style.height = "auto";
        img.style.maxWidth = "none";
    }

    function centerChart() {
        if (!stage) return;
        window.requestAnimationFrame(function () {
            var w = chartEl.scrollWidth;
            var h = chartEl.scrollHeight;
            stage.scrollLeft = Math.max(0, (w - stage.clientWidth) / 2);
            stage.scrollTop = Math.max(0, (h - stage.clientHeight) / 2);
        });
    }

    function applyZoom(next, keepCenter) {
        var prev = zoom;
        zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(next * 100) / 100));
        setImageZoom(zoom);
        if (zoomLabel) zoomLabel.textContent = Math.round(zoom * 100) + "%";
        if (!stage || !keepCenter || !prev) return;
        var rect = stage.getBoundingClientRect();
        var cx = stage.scrollLeft + rect.width / 2;
        var cy = stage.scrollTop + rect.height / 2;
        var ratio = zoom / prev;
        stage.scrollLeft = cx * ratio - rect.width / 2;
        stage.scrollTop = cy * ratio - rect.height / 2;
    }

    function fitChart() {
        var img = chartImage();
        var naturalW = (img && img.naturalWidth) || BASE_IMG_WIDTH;
        var naturalH = (img && img.naturalHeight) || 512;
        if (!stage) {
            applyZoom(1);
            return;
        }
        setImageZoom(1);
        var at100 = chartChromeSize(naturalW, naturalH);
        var pad = 8;
        var availW = Math.max(stage.clientWidth - pad, 120);
        var availH = Math.max(stage.clientHeight - pad, 120);
        var next = Math.min(availW / at100.width, availH / at100.height, 1);
        applyZoom(Math.max(MIN_ZOOM, next), false);
        centerChart();
    }

    function openModal() {
        if (modal.classList.contains("is-open")) return;
        lastFocus = document.activeElement;
        modal.hidden = false;
        document.documentElement.style.overflow = "hidden";
        document.body.classList.add("modal-open");
        window.requestAnimationFrame(function () {
            modal.classList.add("is-open");
            window.requestAnimationFrame(fitChart);
        });
        var closeBtn = modal.querySelector("[data-org-close].org-chart-close");
        if (closeBtn) closeBtn.focus();
    }

    function closeModal() {
        if (modal.hidden && !modal.classList.contains("is-open")) return;
        modal.classList.remove("is-open");
        dragging = false;
        if (stage) stage.classList.remove("is-grabbing");

        var finished = false;
        function finishClose() {
            if (finished) return;
            finished = true;
            modal.hidden = true;
            document.documentElement.style.overflow = "";
            document.body.classList.remove("modal-open");
            if (lastFocus && lastFocus.focus) lastFocus.focus();
        }

        function onTransitionEnd(event) {
            if (event.target !== modal.querySelector(".org-chart-modal-panel")) return;
            modal.removeEventListener("transitionend", onTransitionEnd);
            finishClose();
        }

        modal.addEventListener("transitionend", onTransitionEnd);
        window.setTimeout(finishClose, 420);
    }

    document.addEventListener("click", function (event) {
        if (dragMoved) {
            dragMoved = false;
            return;
        }
        if (event.target.closest("[data-org-open]")) {
            openModal();
            return;
        }
        if (event.target.closest("[data-org-close]")) {
            closeModal();
            return;
        }
        if (event.target.closest("[data-org-zoom-in]")) {
            applyZoom(zoom + ZOOM_STEP, true);
            return;
        }
        if (event.target.closest("[data-org-zoom-out]")) {
            applyZoom(zoom - ZOOM_STEP, true);
            return;
        }
        if (event.target.closest("[data-org-zoom-reset]")) {
            fitChart();
        }
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") closeModal();
    });

    if (stage) {
        stage.addEventListener(
            "wheel",
            function (event) {
                if (!event.ctrlKey && !event.metaKey) return;
                event.preventDefault();
                applyZoom(zoom + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP), true);
            },
            { passive: false }
        );

        stage.addEventListener("pointerdown", function (event) {
            if (event.button !== 0) return;
            if (event.target.closest("button, a")) return;
            dragging = true;
            dragMoved = false;
            startX = event.clientX;
            startY = event.clientY;
            startLeft = stage.scrollLeft;
            startTop = stage.scrollTop;
            stage.classList.add("is-grabbing");
            stage.setPointerCapture(event.pointerId);
        });

        stage.addEventListener("pointermove", function (event) {
            if (!dragging) return;
            var dx = event.clientX - startX;
            var dy = event.clientY - startY;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMoved = true;
            stage.scrollLeft = startLeft - dx;
            stage.scrollTop = startTop - dy;
        });

        function endDrag(event) {
            if (!dragging) return;
            dragging = false;
            stage.classList.remove("is-grabbing");
            try {
                stage.releasePointerCapture(event.pointerId);
            } catch (err) {}
        }

        stage.addEventListener("pointerup", endDrag);
        stage.addEventListener("pointercancel", endDrag);
    }

    window.addEventListener("resize", function () {
        if (!modal.hidden) fitChart();
    });

    Promise.all([fetchOrg(), fetchDownloads()])
        .then(function (pair) {
            var data = pair[0];
            var dl = pair[1];
            var esc = window.KSL_ESCAPE || function (value) { return String(value == null ? "" : value); };
            if (data) {
                paintIntro(data, esc);
                paintChart();
            }
            if (!data || !dl) {
                return;
            }
            var chartId = data.chartDownloadId;
            var chart = (dl.items || []).find(function (i) { return i.id === chartId; });
            var chartHrefRaw = chart ? (chart.href || (dl.baseUrl + chart.file)) : "downloads.html";
            var chartHref = (window.KSL_SAFE_LINK && window.KSL_SAFE_LINK(chartHrefRaw)) || "downloads.html";
            var html = '<section class="ksl-org-extra mb-5" aria-label="Leadership">';
            html += '<h2 class="h4 mb-3">Executive leadership</h2><div class="row g-3">';
            (data.leadership || []).forEach(function (row) {
                html += '<div class="col-md-6"><div class="pillar-card p-4 h-100"><h3 class="h6 text-primary">' + esc(row.role) + "</h3><p class=\"mb-0\">" + esc(row.summary) + "</p></div></div>";
            });
            html += '</div><p class="mt-4 mb-0">' + (window.kslDocButton
                ? window.kslDocButton(chartHref, "Strategic Plan")
                : '<a class="btn btn-outline-primary" href="' + esc(chartHref) + '" target="_blank" rel="noopener">Download organisation reference (Strategic Plan)</a>') + '</p>';
            html += "</section>";
            mount.innerHTML = html;
        }).then(function () {
            if (window.KSL_LIVE) window.KSL_LIVE.show("[data-ksl-await='page']");
        }, function () {
            if (window.KSL_LIVE) window.KSL_LIVE.show("[data-ksl-await='page']");
        });
})();
