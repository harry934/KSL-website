/* Swaps photos that staff replaced in the admin. Soft blue hold until the real image loads — no default photo flash. */
(function () {
    "use strict";

    var CSS_SLOTS = {
        "chrome.home-hero": "--ksl-photo-home-hero",
        "chrome.flag": "--ksl-photo-flag",
        "chrome.banner-mombasa": "--ksl-photo-banner-mombasa"
    };
    var overrides = {};

    function safeUrl(value) {
        var url = window.KSL_CONTENT && window.KSL_CONTENT.safeMediaUrl
            ? window.KSL_CONTENT.safeMediaUrl(value)
            : "";
        if (!url) return "";
        // CSS url("...") still needs quotes stripped from the value itself.
        return url.replace(/"/g, "");
    }

    function whenLoaded(url, done) {
        var img = new Image();
        img.decoding = "async";
        if (img.fetchPriority !== undefined) img.fetchPriority = "high";
        img.onload = function () { done(true); };
        img.onerror = function () { done(false); };
        img.src = url;
    }

    function isImageUrl(url) {
        if (window.KSL_CONTENT && window.KSL_CONTENT.isImageMedia) return window.KSL_CONTENT.isImageMedia(url);
        return /\.(png|jpe?g|webp|gif|avif)(\?|#|$)/i.test(url);
    }

    function isVideoUrl(url) {
        if (window.KSL_CONTENT && window.KSL_CONTENT.isVideoMedia) return window.KSL_CONTENT.isVideoMedia(url);
        return /\.(mp4|webm)(\?|#|$)/i.test(url);
    }

    function revealPhoto(el) {
        if (!el || !el.classList) return;
        el.classList.remove("is-waiting");
        el.classList.add("is-photo-ready");
    }

    function armPhotoSlots() {
        document.querySelectorAll(".page-header[data-ksl-image]").forEach(function (el) {
            el.classList.add("is-waiting");
            el.classList.remove("is-photo-ready");
            el.style.removeProperty("--ksl-photo-page-header");
        });
        var hero = document.querySelector(".ksl-hero");
        if (hero) {
            hero.classList.add("is-waiting");
            hero.classList.remove("is-photo-ready");
        }
    }

    function paint(el) {
        var id = el.getAttribute("data-ksl-image");
        var url = id && overrides[id];
        if (el.classList && el.classList.contains("page-header")) {
            el.classList.add("is-waiting");
            el.classList.remove("is-photo-ready");
            if (!url) {
                el.classList.add("is-live");
                return;
            }
            whenLoaded(url, function (ok) {
                if (ok) {
                    el.style.setProperty("--ksl-photo-page-header", 'url("' + url + '")');
                    revealPhoto(el);
                }
                el.classList.add("is-live");
            });
            return;
        }
        if (!url) {
            el.classList.add("is-live");
            return;
        }
        if (el.tagName !== "IMG") {
            el.classList.add("is-live");
            return;
        }
        if (el.getAttribute("src") === url) {
            el.classList.add("is-live");
            return;
        }
        whenLoaded(url, function (ok) {
            if (ok) {
                el.src = url;
                var parent = el.parentElement;
                var href = parent && parent.getAttribute && parent.getAttribute("href");
                if (parent && parent.tagName === "A" && href && isImageUrl(href)) {
                    parent.setAttribute("href", url);
                }
            }
            el.classList.add("is-live");
        });
    }

    function apply(root) {
        Object.keys(CSS_SLOTS).forEach(function (id) {
            var url = overrides[id];
            if (!url) return;
            whenLoaded(url, function (ok) {
                if (!ok) return;
                document.documentElement.style.setProperty(CSS_SLOTS[id], 'url("' + url + '")');
                if (id === "chrome.home-hero") {
                    revealPhoto(document.querySelector(".ksl-hero"));
                }
            });
        });
        var scope = root && root.querySelectorAll ? root : document;
        if (scope.nodeType === 1 && scope.getAttribute && scope.getAttribute("data-ksl-image")) paint(scope);
        scope.querySelectorAll("[data-ksl-image]").forEach(paint);
    }

    function ready() {
        document.documentElement.classList.add("ksl-photos-ready");
    }

    function heroCrop(value) {
        if (!value || typeof value !== "object") return null;
        var x = Number(value.x);
        var y = Number(value.y);
        var w = Number(value.w);
        var h = Number(value.h);
        if (![x, y, w, h].every(function (part) { return isFinite(part); })) return null;
        x = Math.min(1, Math.max(0, x));
        y = Math.min(1, Math.max(0, y));
        w = Math.min(1, Math.max(0, w));
        h = Math.min(1, Math.max(0, h));
        if (x + w > 1) w = 1 - x;
        if (y + h > 1) h = 1 - y;
        if (w < 0.08 || h < 0.08 || (w > 0.98 && h > 0.98)) return null;
        return { x: x, y: y, w: w, h: h };
    }

    function heroTrim(value) {
        if (!value || typeof value !== "object") return null;
        var start = Number(value.start);
        var end = Number(value.end);
        if (!isFinite(start) || !isFinite(end)) return null;
        start = Math.max(0, start);
        if (!(end > start + 0.2)) return null;
        return { start: Math.round(start * 10) / 10, end: Math.round(end * 10) / 10 };
    }

    function publishHero(data) {
        var list = data && data.hero;
        if (!Array.isArray(list) || !list.length) return;
        // Photos only — the shipped hero.mp4 is always the first slide in main.js.
        var clean = [];
        list.forEach(function (item) {
            var url = safeUrl(item && item.url);
            if (!url || !isImageUrl(url)) return;
            if (item && item.kind === "video") return;
            clean.push({
                kind: "image",
                url: url,
                crop: null,
                trim: null,
                title: item && typeof item.title === "string" ? item.title : "",
                subtitle: item && typeof item.subtitle === "string" ? item.subtitle : "",
                buttonLabel: item && typeof item.buttonLabel === "string" ? item.buttonLabel : "",
                buttonUrl: item && typeof item.buttonUrl === "string" ? item.buttonUrl : ""
            });
        });
        if (!clean.length) return;
        window.KSL_HERO_MEDIA = clean;
        primeHero();
        try {
            window.dispatchEvent(new CustomEvent("ksl-hero-media", { detail: clean }));
        } catch (err) {}
    }

    function escapeHeroText(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function primeHero() {
        var hero = document.querySelector(".ksl-hero");
        if (!hero) return;
        var item = window.KSL_HERO_MEDIA && window.KSL_HERO_MEDIA[0];
        var intro = hero.querySelector(".ksl-hero-intro");
        if (intro && item) {
            var heading = intro.querySelector("h1");
            var copy = intro.querySelector("p");
            var button = intro.querySelector("a.btn");
            if (heading && item.title) {
                heading.innerHTML = escapeHeroText(item.title).replace(/Shipbuilding/i, '<span class="ksl-hero-accent">$&</span>');
            }
            if (copy) {
                var sub = String(item.subtitle || "").trim();
                if (sub) {
                    copy.textContent = sub;
                    copy.hidden = false;
                } else {
                    copy.textContent = "";
                    copy.hidden = true;
                }
            }
            if (button) {
                if (item.buttonLabel) button.textContent = item.buttonLabel;
                var heroHref = (window.KSL_SAFE_LINK && window.KSL_SAFE_LINK(item.buttonUrl)) || "";
                if (heroHref) button.setAttribute("href", heroHref);
            }
        }
        if (item && item.kind === "image") {
            var video = hero.querySelector("video.ksl-hero-video");
            whenLoaded(item.url, function (ok) {
                if (!ok) return;
                if (video) {
                    video.setAttribute("poster", item.url);
                    video.removeAttribute("data-src");
                }
                document.documentElement.style.setProperty("--ksl-photo-home-hero", 'url("' + item.url + '")');
                revealPhoto(hero);
            });
        }
        if (item && item.kind === "video") {
            var clip = hero.querySelector("video.ksl-hero-video");
            if (clip) {
                clip.setAttribute("poster", "");
                clip.src = item.url;
                clip.removeAttribute("data-src");
                function onVideoReady() {
                    clip.classList.add("is-ready");
                    hero.classList.add("has-custom-media");
                    revealPhoto(hero);
                }
                if (clip.readyState >= 2) onVideoReady();
                else {
                    clip.addEventListener("loadeddata", onVideoReady, { once: true });
                    clip.addEventListener("error", function () {}, { once: true });
                }
            }
        }
        hero.classList.add("is-live");
    }

    function markImages(root) {
        var nodes = [];
        if (root && root.nodeType === 1 && root.hasAttribute && root.hasAttribute("data-ksl-image")) nodes.push(root);
        var scope = root && root.querySelectorAll ? root : document;
        scope.querySelectorAll("[data-ksl-image]").forEach(function (el) { nodes.push(el); });
        nodes.forEach(function (el) {
            var id = el.getAttribute("data-ksl-image");
            if (el.classList && el.classList.contains("page-header")) {
                // Headers stay on the blue hold unless a real photo already painted.
                if (!el.classList.contains("is-photo-ready")) return;
            }
            if (!forceShow && id && overrides[id] && el.tagName === "IMG" && el.getAttribute("src") !== overrides[id]) return;
            el.classList.add("is-live");
        });
    }

    function take(data) {
        var images = data && data.images;
        if (images && typeof images === "object") {
            Object.keys(images).forEach(function (id) {
                var url = safeUrl(images[id]);
                if (url) overrides[id] = url;
            });
            apply(document);
        }
        publishHero(data);
        settle();
    }

    var forceShow = false;

    function settle(force) {
        if (force) forceShow = true;
        markImages(document);
        primeHero();
        ready();
    }

    armPhotoSlots();
    // Do not paint shipped defaults first — wait for CMS (or timeout) so headers stay soft blue.
    if (window.KSL_CONTENT) {
        window.KSL_CONTENT.fetchJson("/api/public/site-images", "data/site-images.json").then(take).catch(function () {
            settle(true);
        });
    } else {
        settle(true);
    }
    setTimeout(function () { settle(true); }, 8000);

    var observer = new MutationObserver(function (records) {
        records.forEach(function (record) {
            record.addedNodes.forEach(function (node) {
                if (node.nodeType !== 1) return;
                if (Object.keys(overrides).length) apply(node);
                markImages(node);
            });
        });
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
})();
