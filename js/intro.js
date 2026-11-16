/* Opening logo on the home page. */
/* Opening logo on the home page. */
(function () {
    "use strict";

    /**
     * Video intro rules:
     * 1. Once per browser session the first time you land on index.html (Home).
     * 2. Any time you click the header logo (navbar brand).
     * Not triggered by the "Home" nav link or other links to index.html.
     */

    var SESSION_KEY = "ksl-intro-seen";
    var root = document.documentElement;

    function currentPage() {
        var path = window.location.pathname || "";
        var file = path.split("/").pop();
        return file || "index.html";
    }

    function isHomePage() {
        var page = currentPage();
        return page === "index.html" || page === "";
    }

    function markSessionSeen() {
        try {
            sessionStorage.setItem(SESSION_KEY, "1");
        } catch (e) {
            /* ignore */
        }
    }

    function hasSeenThisSession() {
        try {
            return sessionStorage.getItem(SESSION_KEY) === "1";
        } catch (e) {
            return false;
        }
    }

    function wantsLogoIntro() {
        return /[?&]ksl-intro=1(?:&|$)/.test(window.location.search || "");
    }

    function clearLogoIntroQuery() {
        if (!window.history || !window.history.replaceState) {
            return;
        }
        var path = window.location.pathname || "index.html";
        window.history.replaceState(null, "", path);
    }

    function taglineMarkup() {
        var words = [
            { text: "Catalyzing", gold: false },
            { text: "Shipbuilding", gold: true },
            { text: "Industry", gold: false }
        ];
        var n = 0;
        var html = words.map(function (word) {
            var letters = "";
            var i;
            for (i = 0; i < word.text.length; i++) {
                letters += '<span class="ksl-intro-letter' + (word.gold ? " is-gold" : "") + '" style="--i:' + n + '">' + word.text.charAt(i) + "</span>";
                n += 1;
            }
            return '<span class="ksl-intro-word">' + letters + "</span>";
        }).join(" ");

        return '<div class="ksl-intro-tagline" aria-hidden="true"><div class="ksl-intro-tagline-depth">' + html + "</div></div>";
    }

    function playKslIntro() {
        if (document.querySelector(".ksl-intro")) {
            return;
        }

        var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        var EXIT = reduceMotion ? 250 : 1200;
        var MAX_WAIT = reduceMotion ? 2200 : 10000;

        root.classList.add("ksl-intro-pending");
        root.classList.add("ksl-intro-active");
        try {
            window.dispatchEvent(new CustomEvent("ksl-intro-started"));
        } catch (e) {
            /* ignore */
        }

        var intro = document.createElement("div");
        intro.className = "ksl-intro";
        intro.setAttribute("role", "presentation");
        intro.innerHTML =
            '<video class="ksl-intro-video" muted playsinline preload="auto" aria-hidden="true">' +
                '<source src="img/ksl/logo-intro-mobile.mp4?v=20261001-23" media="(max-width: 575.98px)" type="video/mp4">' +
                '<source src="img/ksl/logo-intro.mp4?v=20261001-18" type="video/mp4">' +
            '</video>' +
            '<div class="ksl-intro-ship-silhouette" aria-hidden="true">' +
                '<svg viewBox="0 0 640 180" focusable="false">' +
                    '<path d="M48 112h116l28-30h54V48h126v34h42l42 30h136l-38 40H106z"></path>' +
                    '<path d="M278 48V22h14v26m42 0V10h10v38M238 66h146" fill="none"></path>' +
                '</svg>' +
            '</div>' +
            '<div class="ksl-intro-logo-shadow" aria-hidden="true"></div>' +
            '<div class="ksl-intro-ripples" aria-hidden="true"><span></span><span></span></div>' +
            '<div class="ksl-intro-reflection" aria-hidden="true"><img data-ksl-image="brand.logo" src="img/ksl/logo.png" alt=""></div>' +
            taglineMarkup();

        document.body.appendChild(intro);
        window.requestAnimationFrame(function () {
            window.requestAnimationFrame(function () {
                if (done) {
                    return;
                }
                root.classList.remove("ksl-intro-pending");
                try {
                    window.dispatchEvent(new CustomEvent("ksl-intro-underlay"));
                } catch (e) {
                    /* ignore */
                }
            });
        });

        var video = intro.querySelector(".ksl-intro-video");
        var done = false;
        var clipStarted = false;
        var fallbackTimer;

        function playClip() {
            if (done || clipStarted || !video) {
                return;
            }
            clipStarted = true;
            intro.classList.add("is-ready");
            root.classList.remove("ksl-intro-pending");

            if (reduceMotion) {
                video.pause();
                intro.classList.add("show-ship");
                intro.classList.add("show-logo-depth");
                intro.classList.add("show-tagline");
                window.setTimeout(finish, 900);
                return;
            }

            var playPromise = video.play();
            if (playPromise && typeof playPromise.catch === "function") {
                playPromise.catch(function () {
                    finish();
                });
            }
        }

        function animateLogoHome() {
            var target = document.querySelector("a.navbar-brand .ksl-logo");
            if (!target || !target.getBoundingClientRect) {
                return;
            }

            var targetRect = target.getBoundingClientRect();
            if (!targetRect.width || !targetRect.height) {
                return;
            }

            var flightLogo = document.createElement("img");
            flightLogo.className = "ksl-intro-flight-logo";
            flightLogo.setAttribute("data-ksl-image", "brand.logo");
            flightLogo.src = "img/ksl/logo.png";
            flightLogo.alt = "";
            flightLogo.setAttribute("aria-hidden", "true");
            document.body.appendChild(flightLogo);

            var startRect = flightLogo.getBoundingClientRect();
            flightLogo.style.left = startRect.left + "px";
            flightLogo.style.top = startRect.top + "px";
            flightLogo.style.width = startRect.width + "px";
            flightLogo.style.transform = "none";

            var moveX = targetRect.left - startRect.left;
            var moveY = targetRect.top - startRect.top;
            var scale = targetRect.width / startRect.width;
            var removed = false;

            function removeFlightLogo() {
                if (removed) {
                    return;
                }
                removed = true;
                if (flightLogo.parentNode) {
                    flightLogo.parentNode.removeChild(flightLogo);
                }
            }

            if (flightLogo.animate) {
                var animation = flightLogo.animate([
                    { opacity: 0, transform: "translate3d(0, 0, 0) scale(1)" },
                    { opacity: 1, offset: 0.14 },
                    { opacity: 1, transform: "translate3d(" + moveX + "px, " + moveY + "px, 0) scale(" + scale + ")" }
                ], {
                    duration: 700,
                    easing: "cubic-bezier(.22, 1, .36, 1)",
                    fill: "forwards"
                });
                animation.finished.then(removeFlightLogo, removeFlightLogo);
            } else {
                removeFlightLogo();
            }

            window.setTimeout(removeFlightLogo, 950);
        }

        function finish(moveLogoHome) {
            if (done) {
                return;
            }
            done = true;
            window.clearTimeout(fallbackTimer);
            document.removeEventListener("keydown", onKey);
            if (video) {
                video.pause();
            }
            root.classList.remove("ksl-intro-pending");
            root.classList.add("ksl-intro-handoff");
            if (moveLogoHome === true && !reduceMotion) {
                animateLogoHome();
            }
            intro.classList.add("is-leaving");
            try {
                window.dispatchEvent(new CustomEvent("ksl-intro-ended"));
            } catch (e) {
                /* ignore */
            }
            window.setTimeout(function () {
                root.classList.remove("ksl-intro-active");
                root.classList.remove("ksl-intro-handoff");
                if (intro.parentNode) {
                    intro.parentNode.removeChild(intro);
                }
            }, EXIT);
        }

        function onKey(e) {
            if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
                finish();
            }
        }

        if (video) {
            video.addEventListener("canplay", playClip, { once: true });
            video.addEventListener("timeupdate", function () {
                if (!Number.isFinite(video.duration)) {
                    return;
                }
                var remaining = video.duration - video.currentTime;
                intro.classList.toggle("show-ship", remaining <= 2.5);
                intro.classList.toggle("show-logo-depth", remaining <= 2.1);
                intro.classList.toggle("show-ripples", remaining <= 1.85);
                intro.classList.toggle("show-tagline", remaining <= 1.9);
            });
            video.addEventListener("ended", function () {
                finish(true);
            }, { once: true });
            video.addEventListener("error", finish, { once: true });

            if (video.readyState >= 3) {
                playClip();
            } else {
                video.load();
            }
        } else {
            finish();
        }

        intro.addEventListener("click", finish);
        document.addEventListener("keydown", onKey);
        fallbackTimer = window.setTimeout(finish, MAX_WAIT);
    }

    window.playKslIntro = playKslIntro;

    function bindLogoBrand() {
        document.addEventListener("click", function (event) {
            var brand = event.target.closest("a.navbar-brand");
            if (!brand || brand.getAttribute("target") === "_blank") {
                return;
            }

            if (isHomePage()) {
                event.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
                playKslIntro();
                return;
            }

            event.preventDefault();
            window.location.href = "index.html?ksl-intro=1";
        });
    }

    function maybeAutoIntroOnHome() {
        if (!isHomePage()) {
            return;
        }

        var fromLogo = wantsLogoIntro();
        var firstHomeThisSession = !hasSeenThisSession();

        if (fromLogo || firstHomeThisSession) {
            playKslIntro();
            markSessionSeen();
            if (fromLogo) {
                clearLogoIntroQuery();
            }
        }
    }

    function boot() {
        if (document.documentElement.classList.contains("ksl-maint-hold")) {
            document.addEventListener("ksl-maintenance-clear", boot, { once: true });
            return;
        }
        if (document.documentElement.classList.contains("ksl-maint-on")) return;
        bindLogoBrand();
        maybeAutoIntroOnHome();
    }

    if (document.body) {
        boot();
    } else {
        document.addEventListener("DOMContentLoaded", boot);
    }
})();
