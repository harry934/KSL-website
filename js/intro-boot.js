/* Runs before paint so the home intro can hide the page without an inline script. */
(function () {
    var path = (location.pathname || "").split("/").pop();
    var home = !path || path === "index.html";
    var force = /[?&]ksl-intro=1(?:&|$)/.test(location.search || "");
    var seen = false;
    try { seen = sessionStorage.getItem("ksl-intro-seen") === "1"; } catch (e) {}
    if (force || (home && !seen)) document.documentElement.classList.add("ksl-intro-pending");
})();
