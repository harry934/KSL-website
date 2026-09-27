(function () {
    "use strict";

    var KEY = "ksl-intro-seen";
    var root = document.documentElement;

    try {
        if (sessionStorage.getItem(KEY)) return;
        sessionStorage.setItem(KEY, "1");
    } catch (e) {
        return;
    }

    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var HOLD = reduceMotion ? 900 : 3200;
    var EXIT = reduceMotion ? 300 : 900;

    root.classList.add("ksl-intro-pending");

    function build() {
        var intro = document.createElement("div");
        intro.className = "ksl-intro";
        intro.setAttribute("role", "presentation");
        intro.innerHTML =
            '<div class="ksl-intro-glow"></div>' +
            '<div class="ksl-intro-stage">' +
                '<div class="ksl-intro-badge">' +
                    '<svg class="ksl-intro-rings" viewBox="0 0 200 200" aria-hidden="true">' +
                        '<circle class="ksl-intro-ring ksl-intro-ring-outer" cx="100" cy="100" r="96"></circle>' +
                        '<circle class="ksl-intro-ring ksl-intro-ring-inner" cx="100" cy="100" r="88"></circle>' +
                    '</svg>' +
                    '<div class="ksl-intro-logo">' +
                        '<img src="img/ksl/logo.png" alt="">' +
                        '<span class="ksl-intro-shine"></span>' +
                    '</div>' +
                '</div>' +
                '<div class="ksl-intro-name">Kenya Shipyards Limited</div>' +
                '<div class="ksl-intro-line"></div>' +
                '<div class="ksl-intro-tag">Catalyzing Shipbuilding Industry</div>' +
            '</div>' +
            '<svg class="ksl-intro-waves" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true">' +
                '<path class="ksl-intro-wave ksl-intro-wave-back" d="M0,60 C240,110 480,10 720,60 C960,110 1200,10 1440,60 C1680,110 1920,10 2160,60 C2400,110 2640,10 2880,60 L2880,120 L0,120 Z"></path>' +
                '<path class="ksl-intro-wave ksl-intro-wave-front" d="M0,80 C240,40 480,120 720,80 C960,40 1200,120 1440,80 C1680,40 1920,120 2160,80 C2400,40 2640,120 2880,80 L2880,120 L0,120 Z"></path>' +
            '</svg>';

        document.body.appendChild(intro);

        var done = false;
        function finish() {
            if (done) return;
            done = true;
            intro.classList.add("is-leaving");
            root.classList.remove("ksl-intro-pending");
            setTimeout(function () {
                if (intro.parentNode) intro.parentNode.removeChild(intro);
            }, EXIT);
        }

        intro.addEventListener("click", finish);
        document.addEventListener("keydown", function onKey(e) {
            if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
                document.removeEventListener("keydown", onKey);
                finish();
            }
        });
        setTimeout(finish, HOLD);
    }

    if (document.body) {
        build();
    } else {
        document.addEventListener("DOMContentLoaded", build);
    }
})();
