/* 404 page: mark blocked-input visits without an inline script. */
(function () {
    document.documentElement.classList.toggle("ksl-blocked", /(?:^|[?&])blocked=1(?:&|$)/.test(location.search));
    if (document.documentElement.classList.contains("ksl-blocked")) {
        document.title = "Input blocked | Kenya Shipyards Limited";
    }
})();
