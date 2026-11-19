/* Leave origin as an empty string while the site stays on Vercel.
   On the VPS, set it once to the staff portal address, with no trailing slash.
   Example: var origin = "http://178.162.219.218/kwela";
   bash deploy/vps/fill-ip.sh writes this line for you. */
(function () {
    "use strict";
    var origin = "http://178.162.219.218/kwela";
    if (!origin) return;
    document.documentElement.setAttribute("data-ksl-content-api", origin.replace(/\/$/, ""));
})();
