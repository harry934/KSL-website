/* Start the home hero film before the main script bundle loads. */
(function () {
    "use strict";
    var path = (location.pathname || "").split("/").pop();
    if (path && path !== "index.html") return;
    var run = function () {
        var video = document.querySelector(".ksl-hero-video");
        if (!video || video.getAttribute("src")) return;
        var src = video.getAttribute("data-src");
        if (!src) return;
        video.src = src;
        try {
            video.load();
        } catch (e) { /* ignore */ }
    };
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", run);
    } else {
        run();
    }
})();