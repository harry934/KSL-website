/* 404 page: mark blocked-input visits without an inline script. */
(function () {
    document.documentElement.classList.toggle("ksl-blocked", /(?:^|[?&])blocked=1(?:&|$)/.test(location.search));
    if (document.documentElement.classList.contains("ksl-blocked")) {
        document.title = "Page not found | Kenya Shipyards Limited";
    }
    function hide404Spinner() {
        if (!document.body || !document.body.classList.contains("ksl-404")) return;
        var spinner = document.getElementById("spinner");
        if (spinner) spinner.classList.remove("show");
    }
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", hide404Spinner);
    } else {
        hide404Spinner();
    }
})();
