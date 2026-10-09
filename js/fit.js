(function () {
    "use strict";

    var BASE_WIDTH = 1366;
    var root = document.documentElement;
    var textScale = 1;

    function fit() {
        var width = window.innerWidth;
        var scale = (width > BASE_WIDTH ? width / BASE_WIDTH : 1) * textScale;
        root.style.zoom = scale === 1 ? "" : scale.toFixed(4);
    }

    window.kslSetTextScale = function (value) {
        textScale = value || 1;
        fit();
    };

    fit();
    window.addEventListener("resize", fit);
})();
