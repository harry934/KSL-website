(function () {
    "use strict";

    var BASE_WIDTH = 1366;
    var root = document.documentElement;

    function fit() {
        var width = window.innerWidth;
        root.style.zoom = width > BASE_WIDTH ? (width / BASE_WIDTH).toFixed(4) : "";
    }

    fit();
    window.addEventListener("resize", fit);
})();
