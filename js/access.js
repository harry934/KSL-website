/* Text size, contrast and motion choices, remembered in this browser. */
(function () {
    var KEY = "ksl-a11y";
    var fontStep = 0;
    var flags = {};

    var style = document.createElement("style");
    style.id = "ksl-a11y-style";
    style.textContent = [
        ".ksl-a11y{font-family:Arial,Helvetica,sans-serif}",
        ".ksl-a11y-toggle{position:fixed;right:12px;bottom:74px;z-index:999991;display:grid;place-items:center;width:46px;height:46px;margin:0;padding:0;border:1.5px solid #111;border-radius:50%;background:#C9A95C;color:#111;cursor:pointer;box-shadow:none;overflow:visible}",
        ".ksl-a11y-toggle:hover{filter:brightness(.93)}",
        ".ksl-a11y-toggle:focus-visible{outline:2px solid #111;outline-offset:3px}",
        ".ksl-a11y-toggle svg{width:24px;height:24px;display:block;fill:currentColor}",
        "@media (min-width:992px){.ksl-a11y.is-open .ksl-a11y-toggle{right:calc(min(280px,88vw) + 16px)}}",
        ".ksl-a11y-label{display:none}",
        ".ksl-a11y-panel{position:fixed;top:0;right:0;bottom:0;left:auto;z-index:999992;width:min(280px,88vw);height:auto;visibility:hidden;pointer-events:none;transform:translateX(110%);transition:transform .25s ease;background:#232323;color:#fff;display:flex;flex-direction:column;box-shadow:-8px 0 24px rgba(0,0,0,.25)}",
        ".ksl-a11y.is-open .ksl-a11y-panel{visibility:visible;pointer-events:auto;transform:translateX(0)}",
        "@media (max-width:991.98px){.ksl-a11y-toggle{right:0 !important;bottom:calc(132px + env(safe-area-inset-bottom,0px)) !important;width:40px !important;height:44px !important;padding:0 !important;border:0 !important;border-radius:10px 0 0 10px !important;box-shadow:-2px 4px 12px rgba(9,41,108,.18) !important}.ksl-a11y-toggle svg{width:22px;height:22px}}",
        "body.modal-open .ksl-a11y-toggle,body.modal-open .whatsapp-fab,body.modal-open .ksl-wa-pop{opacity:0 !important;visibility:hidden !important;pointer-events:none !important}",
        "body:has(.board-modal:not([hidden])) :is(.ksl-a11y-toggle,.whatsapp-fab,.ksl-wa-pop),body:has(.ksl-mobile-sheet[aria-hidden=\"false\"]) :is(.ksl-a11y-toggle,.whatsapp-fab,.ksl-wa-pop),body:has(#lightbox[style*=\"block\"]) :is(.ksl-a11y-toggle,.whatsapp-fab,.ksl-wa-pop){opacity:0 !important;visibility:hidden !important;pointer-events:none !important}",
        ".ksl-a11y-close{display:block;width:92%;margin:10px auto 0;height:34px;border:0;background:#216073;color:#fff;font:bold 15px/34px Arial,Helvetica,sans-serif;cursor:pointer}",
        ".ksl-a11y-close:hover,.ksl-a11y-close:focus{background:#fff;color:#000}",
        ".ksl-a11y-scroll{overflow:auto;padding:8px 10px 16px;flex:1}",
        ".ksl-a11y-mod{padding-bottom:.6rem;margin-bottom:.6rem;border-bottom:1px solid #444}",
        ".ksl-a11y-mod h2{margin:0 0 .4rem;font:600 16px/1.3 Arial,Helvetica,sans-serif;color:#fff}",
        ".ksl-a11y-note{margin:0 0 .45rem;color:#f5c518;font:600 13px/1.3 Arial,Helvetica,sans-serif}",
        ".ksl-a11y-row{display:flex;gap:8%}",
        ".ksl-a11y-act{display:block;width:100%;margin:0;padding:5px 0;border:1px solid #fff;background:#232323;color:#fff;font:bold 15px/1.3 Arial,Helvetica,sans-serif;text-align:center;cursor:pointer}",
        ".ksl-a11y-row .ksl-a11y-act{width:46%}",
        ".ksl-a11y-act.is-on,.ksl-a11y-act[aria-pressed='true']{background:#f5c518;color:#111}",
        "html.ksl-keys #ksl-page :is(a,button,input,select,textarea,summary,[tabindex]):focus-visible{outline:3px solid #111 !important;outline-offset:3px !important;background-color:#f3f57c !important;color:#111 !important}",
        "html.ksl-readable #ksl-page :is(h1,h2,h3,h4,h5,h6,p,a,li,label,button,input,textarea,select,td,th,figcaption,blockquote,span){font-family:Verdana,Geneva,sans-serif !important;letter-spacing:.02em;line-height:1.6}",
        "html.ksl-underline #ksl-page a,html.ksl-underline #ksl-page a:hover{text-decoration:underline !important;text-underline-offset:2px}",
        "html.ksl-highlight #ksl-page a,html.ksl-highlight #ksl-page a:hover,html.ksl-highlight #ksl-page a:focus,html.ksl-highlight #ksl-page a:visited{background-color:#fff34d !important;background-image:none !important;color:#111 !important;box-shadow:inset 0 -2px 0 #111 !important}",
        "html.ksl-grey #ksl-page img,html.ksl-grey #ksl-page video,html.ksl-grey #ksl-page canvas,html.ksl-grey #ksl-page .facts-bg,html.ksl-grey #ksl-page .page-header,html.ksl-grey #ksl-page .ksl-hero,html.ksl-grey #ksl-page [style*='background-image']{filter:grayscale(1) !important}",
        "html.ksl-invert{background:#fff}",
        "html.ksl-invert #ksl-page{filter:invert(1) hue-rotate(180deg)}",
        "html.ksl-no-anim #ksl-page,html.ksl-no-anim #ksl-page *,html.ksl-no-anim #ksl-page *::before,html.ksl-no-anim #ksl-page *::after{animation:none !important;transition:none !important;scroll-behavior:auto !important}",
        ".ksl-lights-spot{display:none;position:fixed;z-index:999980;width:280px;height:180px;margin:-90px 0 0 -140px;border-radius:16px;pointer-events:none;background:transparent;box-shadow:0 0 0 100vmax rgba(0,0,0,.84)}",
        "html.ksl-lights .ksl-lights-spot{display:block}",
        ".ksl-wa-pop{position:fixed;right:0;bottom:214px;z-index:999989;width:min(260px,82vw);padding:16px 16px 14px;background:#fff;color:#273272;border-radius:10px 0 0 10px;box-shadow:-8px 8px 28px rgba(9,41,108,.22);visibility:hidden;pointer-events:none;transform:translateX(110%);transition:transform .25s ease,visibility .25s ease}",
        ".ksl-wa-pop.is-open{visibility:visible;pointer-events:auto;transform:translateX(0)}",
        ".ksl-wa-pop p{margin:0 0 12px;font:600 14px/1.45 Arial,Helvetica,sans-serif;color:#273272}",
        ".ksl-wa-pop a{display:block;margin:0 0 8px;padding:10px 12px;background:#25D366;color:#fff;text-align:center;text-decoration:none;font:700 14px/1 Arial,Helvetica,sans-serif;border-radius:4px}",
        ".ksl-wa-pop button{display:block;width:100%;border:0;background:#216073;color:#fff;padding:8px 10px;cursor:pointer;font:700 14px/1 Arial,Helvetica,sans-serif}",
        ".ksl-a11y-toggle,.whatsapp-fab{transition:opacity .5s cubic-bezier(.22,1,.36,1),transform .6s cubic-bezier(.22,1,.36,1),visibility 0s linear 0s,filter .18s ease !important}html.ksl-tabs-hidden .ksl-a11y-toggle,html.ksl-tabs-hidden .whatsapp-fab{opacity:0 !important;visibility:hidden !important;pointer-events:none !important;transform:translateX(130%) scale(.86) !important;transition:opacity .45s ease,transform .5s cubic-bezier(.55,0,.45,1),visibility 0s linear .5s,filter .18s ease !important}@media (max-width:991.98px){.ksl-wa-pop{right:48px;bottom:calc(80px + env(safe-area-inset-bottom,0px));border-radius:10px}}"
    ].join("");
    document.head.appendChild(style);

    var root = document.createElement("div");
    root.className = "ksl-a11y";
    root.innerHTML = [
        '<button type="button" class="ksl-a11y-toggle" aria-expanded="false" aria-controls="ksl-a11y-panel" title="Accessibility" aria-label="Accessibility">',
        '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="4.4" r="2.1"/><path d="M20.3 7.6a.9.9 0 0 1-.64 1.1c-1.9.52-3.8.84-5.66.97v3.02l1.9 7.35a1 1 0 0 1-1.94.5L12.3 15h-.6l-1.66 5.54a1 1 0 0 1-1.94-.5L10 12.7V9.67c-1.86-.13-3.76-.45-5.66-.97a.9.9 0 1 1 .48-1.74c2.4.66 4.8.99 7.18.99s4.78-.33 7.18-.99a.9.9 0 0 1 1.12.64z"/></svg>',
        '<span class="ksl-a11y-label">Accessibility</span>',
        "</button>",
        '<div id="ksl-a11y-panel" class="ksl-a11y-panel">',
        '<button type="button" class="ksl-a11y-close" data-close>Close</button>',
        '<div class="ksl-a11y-scroll">',
        '<div class="ksl-a11y-mod"><h2>Font Resize</h2><p class="ksl-a11y-note" id="ksl-font-note">Text size 100%</p><div class="ksl-a11y-row">',
        '<button type="button" class="ksl-a11y-act" data-act="font-down" title="smaller font size" aria-label="smaller font size">A-</button>',
        '<button type="button" class="ksl-a11y-act" data-act="font-up" title="larger font size" aria-label="larger font size">A+</button>',
        "</div></div>",
        btn("keys", "Keyboard navigation"),
        btn("readable", "Readable Font"),
        btn("underline", "Underline links"),
        btn("highlight", "Highlight Links"),
        btn("clear", "Clear cookies"),
        btn("grey", "Images Greyscale"),
        btn("invert", "Invert Colors"),
        btn("motion", "Remove Animations"),
        btn("lights", "Lights Off"),
        '<button type="button" class="ksl-a11y-close" data-close>Close</button>',
        "</div></div>"
    ].join("");
    document.body.appendChild(root);

    function btn(act, label) {
        return '<div class="ksl-a11y-mod"><button type="button" class="ksl-a11y-act" data-act="' + act + '" aria-pressed="false">' + label + "</button></div>";
    }

    var toggle = root.querySelector(".ksl-a11y-toggle");
    var CLASS = {
        keys: "ksl-keys",
        readable: "ksl-readable",
        underline: "ksl-underline",
        highlight: "ksl-highlight",
        grey: "ksl-grey",
        invert: "ksl-invert",
        motion: "ksl-no-anim",
        lights: "ksl-lights"
    };

    var waPop = null;

    function closeWaPop() {
        if (!waPop) {
            return;
        }
        waPop.classList.remove("is-open");
    }

    function setOpen(open) {
        if (open) {
            closeWaPop();
        }
        root.classList.toggle("is-open", open);
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
    }

    function bindWhatsappBar() {
        var links = document.querySelectorAll("a.whatsapp-fab");
        if (!links.length) {
            return;
        }
        var href = links[0].getAttribute("href") || "https://wa.me/254726277377";
        waPop = document.createElement("div");
        waPop.className = "ksl-wa-pop";
        waPop.setAttribute("role", "dialog");
        waPop.setAttribute("aria-label", "WhatsApp");
        waPop.innerHTML = "<p>Chat with Kenya Shipyards Limited</p><a href=\"" + href + "\" target=\"_blank\" rel=\"noopener\">Open WhatsApp</a><button type=\"button\" data-wa-close>Close</button>";
        document.body.appendChild(waPop);
        links.forEach(function (link) {
            link.addEventListener("click", function (event) {
                event.preventDefault();
                var willOpen = !waPop.classList.contains("is-open");
                if (willOpen) {
                    setOpen(false);
                    waPop.classList.add("is-open");
                } else {
                    closeWaPop();
                }
            });
        });
        waPop.querySelector("[data-wa-close]").addEventListener("click", closeWaPop);
    }

    bindWhatsappBar();

    var spot = document.createElement("div");
    spot.className = "ksl-lights-spot";
    spot.setAttribute("aria-hidden", "true");
    document.body.appendChild(spot);

    function pageRoot() {
        var page = document.getElementById("ksl-page");
        if (page) {
            return page;
        }
        page = document.createElement("div");
        page.id = "ksl-page";
        Array.prototype.slice.call(document.body.childNodes).forEach(function (node) {
            if (node.nodeType === 1 && (
                node.id === "ksl-page" ||
                node.classList.contains("ksl-a11y") ||
                node.classList.contains("whatsapp-fab") ||
                node.classList.contains("ksl-wa-pop") ||
                node.classList.contains("ksl-lights-spot")
            )) {
                return;
            }
            page.appendChild(node);
        });
        document.body.insertBefore(page, document.body.firstChild);
        return page;
    }

    pageRoot();

    function placeSpot(x, y) {
        spot.style.left = x + "px";
        spot.style.top = y + "px";
    }

    document.addEventListener("pointermove", function (event) {
        if (!flags.lights) {
            return;
        }
        placeSpot(event.clientX, event.clientY);
    });

    function paintFont() {
        var scale = 1 + fontStep * 0.1;
        var zoom = fontStep ? String(scale) : "";
        var inverse = fontStep ? String(1 / scale) : "";
        document.documentElement.style.zoom = zoom;
        pageRoot().style.zoom = "";
        [root, document.querySelector(".whatsapp-fab"), waPop, spot].forEach(function (node) {
            if (node) node.style.zoom = inverse;
        });
        var note = document.getElementById("ksl-font-note");
        if (note) {
            note.textContent = "Text size " + Math.round(scale * 100) + "%";
        }
    }

    function setMotion(on) {
        document.querySelectorAll("#ksl-page video").forEach(function (video) {
            if (on) {
                if (!video.paused) {
                    video.pause();
                    video.setAttribute("data-ksl-motion", "1");
                }
            } else if (video.getAttribute("data-ksl-motion") === "1") {
                video.removeAttribute("data-ksl-motion");
                var play = video.play();
                if (play && play.catch) {
                    play.catch(function () {});
                }
            }
        });
    }

    function setFlag(name, on) {
        flags[name] = on;
        var button = root.querySelector('[data-act="' + name + '"]');
        if (button) {
            button.setAttribute("aria-pressed", on ? "true" : "false");
            button.classList.toggle("is-on", on);
        }
        if (CLASS[name]) document.documentElement.classList.toggle(CLASS[name], on);
        if (name === "motion") setMotion(on);
        if (name === "lights") {
            if (on) placeSpot(window.innerWidth / 2, window.innerHeight / 2);
        }
    }

    function restoreStyles() {
        document.querySelectorAll('link[rel="stylesheet"], style').forEach(function (node) {
            if (node.id === "ksl-a11y-style") return;
            node.disabled = false;
        });
    }

    function save() {
        try {
            localStorage.setItem(KEY, JSON.stringify({ fontStep: fontStep, flags: flags }));
        } catch (e) {}
    }

    function clearAll() {
        fontStep = 0;
        paintFont();
        Object.keys(CLASS).forEach(function (name) { setFlag(name, false); });
        restoreStyles();
        document.cookie.split(";").forEach(function (part) {
            var name = part.split("=")[0].trim();
            if (name) document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
        });
        try { localStorage.removeItem(KEY); } catch (e) {}
        var note = root.querySelector("[data-act='clear']");
        if (note) {
            var previous = note.textContent;
            note.textContent = "Accessibility settings cleared";
            setTimeout(function () { note.textContent = previous; }, 1600);
        }
    }

    toggle.addEventListener("click", function () { setOpen(!root.classList.contains("is-open")); });
    root.querySelectorAll("[data-close]").forEach(function (button) {
        button.addEventListener("click", function () { setOpen(false); toggle.focus(); });
    });
    root.addEventListener("click", function (event) {
        var button = event.target.closest("[data-act]");
        if (!button) return;
        var act = button.getAttribute("data-act");
        if (act === "font-down") { fontStep = Math.max(-2, fontStep - 1); paintFont(); save(); return; }
        if (act === "font-up") { fontStep = Math.min(4, fontStep + 1); paintFont(); save(); return; }
        if (act === "clear") { clearAll(); return; }
        setFlag(act, button.getAttribute("aria-pressed") !== "true");
        save();
    });

    try {
        var saved = JSON.parse(localStorage.getItem(KEY) || "{}");
        fontStep = saved.fontStep || 0;
        paintFont();
        restoreStyles();
        if (saved.flags && saved.flags.styles) {
            delete saved.flags.styles;
            flags = saved.flags;
            save();
        }
        if (saved.flags) Object.keys(saved.flags).forEach(function (name) { if (saved.flags[name] && name !== "styles") setFlag(name, true); });
    } catch (e) {}

    (function bindMobileTabIdle() {
        var mq = window.matchMedia("(max-width: 991.98px)");
        var html = document.documentElement;
        var idleTimer = 0;
        var IDLE_MS = 700;

        function showTabs() {
            html.classList.remove("ksl-tabs-hidden");
        }

        function hideWhileActive() {
            html.classList.add("ksl-tabs-hidden");
            window.clearTimeout(idleTimer);
            idleTimer = window.setTimeout(showTabs, IDLE_MS);
        }

        window.addEventListener("scroll", hideWhileActive, { passive: true });
        if (mq.addEventListener) {
            mq.addEventListener("change", showTabs);
        }
    })();
})();
