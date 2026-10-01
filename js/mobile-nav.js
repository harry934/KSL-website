(function () {
    "use strict";

    var mq = window.matchMedia("(max-width: 991.98px)");
    var sheet;
    var menuBtn;

    function currentPage() {
        var path = window.location.pathname || "";
        var file = path.split("/").pop();
        return file || "index.html";
    }

    function setCurrent(link, isCurrent) {
        link.classList.toggle("is-active", isCurrent);
        if (isCurrent) {
            link.setAttribute("aria-current", "page");
        }
    }

    function build() {
        if (!mq.matches || document.querySelector(".ksl-bottom-nav")) {
            return;
        }

        var page = currentPage();
        var iconHome = '<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z"/>';
        var iconService = '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>';
        var iconContact = '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/><path d="M8 9h8M8 13h5"/>';
        var iconMenu = '<line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/>';

        var nav = document.createElement("nav");
        nav.className = "ksl-bottom-nav";
        nav.setAttribute("aria-label", "Mobile navigation");

        [
            { href: "index.html", label: "Home", match: ["index.html"], icon: iconHome },
            { href: "service.html", label: "Services", match: ["service.html"], icon: iconService },
            { href: "contact.html", label: "Contact", match: ["contact.html"], icon: iconContact }
        ].forEach(function (tab) {
            var link = document.createElement("a");
            link.href = tab.href;
            setCurrent(link, tab.match.indexOf(page) !== -1);
            link.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + tab.icon + "</svg><span>" + tab.label + "</span>";
            nav.appendChild(link);
        });

        menuBtn = document.createElement("button");
        menuBtn.type = "button";
        menuBtn.id = "kslOpenMobileSheet";
        menuBtn.setAttribute("aria-label", "Open site menu");
        menuBtn.setAttribute("aria-controls", "kslMobileSheet");
        menuBtn.setAttribute("aria-expanded", "false");
        menuBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + iconMenu + "</svg><span>Menu</span>";
        nav.appendChild(menuBtn);
        document.body.appendChild(nav);

        sheet = document.createElement("div");
        sheet.className = "ksl-mobile-sheet";
        sheet.id = "kslMobileSheet";
        sheet.setAttribute("role", "dialog");
        sheet.setAttribute("aria-modal", "true");
        sheet.setAttribute("aria-labelledby", "kslMobileMenuTitle");
        sheet.setAttribute("aria-hidden", "true");
        sheet.setAttribute("inert", "");

        var sections = [
            {
                title: "Explore",
                links: [
                    { href: "index.html", label: "Home" },
                    { href: "about.html", label: "Who We Are" },
                    { href: "board.html", label: "KSL Board" },
                    { href: "organization.html", label: "Organization Structure" }
                ]
            },
            {
                title: "What We Do",
                links: [
                    { href: "service.html", label: "Services" },
                    { href: "products.html", label: "Products" },
                    { href: "project.html", label: "Projects" },
                    { href: "sustainability.html", label: "Sustainability" }
                ]
            },
            {
                title: "Media",
                links: [
                    { href: "news.html", label: "News and Events", match: ["news.html", "article.html", "event.html"] },
                    { href: "videos.html", label: "Gallery" },
                    { href: "http://10.104.4.139/corporate-documents/", label: "Downloads", external: true }
                ]
            },
            {
                title: "Connect",
                links: [
                    { href: "contact.html", label: "Contact Us" },
                    { href: "careers.html", label: "Careers" },
                    { href: "csr.html", label: "CSR" },
                    { href: "faq.html", label: "FAQ" }
                ]
            }
        ];

        var panelHtml = '<div class="ksl-mobile-sheet-panel" tabindex="-1">';
        panelHtml += '<div class="ksl-mobile-sheet-head"><h2 id="kslMobileMenuTitle">Menu</h2><div class="ksl-mobile-sheet-tools"></div><button type="button" class="ksl-mobile-sheet-close" aria-label="Close menu">&times;</button></div>';
        panelHtml += '<form class="ksl-mobile-menu-search" action="news.html" method="get" role="search"><label class="visually-hidden" for="kslMobileSearch">Search news</label><input id="kslMobileSearch" name="s" type="search" placeholder="Search news" required><button type="submit" aria-label="Submit search"><i class="bi bi-search" aria-hidden="true"></i></button></form>';
        panelHtml += '<div class="ksl-mobile-sheet-sections">';
        sections.forEach(function (section) {
            panelHtml += "<section><h3>" + section.title + "</h3>";
            section.links.forEach(function (link) {
                var matches = link.match || [link.href];
                var active = matches.indexOf(page) !== -1 ? " is-active" : "";
                var current = active ? ' aria-current="page"' : "";
                var external = link.external ? ' target="_blank" rel="noopener"' : "";
                panelHtml += '<a class="' + active + '" href="' + link.href + '"' + external + current + ">" + link.label + "</a>";
            });
            panelHtml += "</section>";
        });
        panelHtml += "</div>";
        panelHtml += '<div class="ksl-mobile-sheet-contact"><a href="tel:+254726277377">+254 726 277 377</a><a href="mailto:publicaffairs@kenyashipyards.co.ke">publicaffairs@kenyashipyards.co.ke</a></div>';
        panelHtml += "</div>";
        sheet.innerHTML = panelHtml;
        document.body.appendChild(sheet);

        var searchValue = "";
        try {
            searchValue = new URLSearchParams(window.location.search).get("s") || "";
        } catch (e) {
            searchValue = "";
        }
        var mobileSearch = sheet.querySelector("#kslMobileSearch");
        if (mobileSearch && searchValue.trim()) {
            mobileSearch.value = searchValue.trim();
        }

        if (!nav.querySelector('[aria-current="page"]')) {
            menuBtn.classList.add("is-active");
        }

        var closeBtn = sheet.querySelector(".ksl-mobile-sheet-close");
        var panel = sheet.querySelector(".ksl-mobile-sheet-panel");

        function openSheet() {
            var openAccessibility = document.querySelector(".ksl-a11y.is-open [data-close]");
            var openWhatsapp = document.querySelector(".ksl-wa-pop.is-open [data-wa-close]");
            if (openAccessibility) {
                openAccessibility.click();
            }
            if (openWhatsapp) {
                openWhatsapp.click();
            }
            sheet.classList.add("is-open");
            sheet.removeAttribute("inert");
            sheet.setAttribute("aria-hidden", "false");
            menuBtn.setAttribute("aria-expanded", "true");
            menuBtn.setAttribute("aria-label", "Close site menu");
            document.body.classList.add("ksl-sheet-open");
            window.requestAnimationFrame(function () {
                closeBtn.focus();
            });
        }

        function closeSheet(restoreFocus) {
            if (!sheet.classList.contains("is-open")) {
                return;
            }
            sheet.classList.remove("is-open");
            sheet.setAttribute("inert", "");
            sheet.setAttribute("aria-hidden", "true");
            menuBtn.setAttribute("aria-expanded", "false");
            menuBtn.setAttribute("aria-label", "Open site menu");
            document.body.classList.remove("ksl-sheet-open");
            if (restoreFocus) {
                menuBtn.focus();
            }
        }

        menuBtn.addEventListener("click", function () {
            if (sheet.classList.contains("is-open")) {
                closeSheet(true);
            } else {
                openSheet();
            }
        });
        closeBtn.addEventListener("click", function () {
            closeSheet(true);
        });
        sheet.addEventListener("click", function (event) {
            if (event.target === sheet) {
                closeSheet(true);
            }
        });
        sheet.querySelectorAll("a").forEach(function (link) {
            link.addEventListener("click", function () {
                closeSheet(false);
            });
        });
        document.addEventListener("keydown", function (event) {
            if (!sheet.classList.contains("is-open")) {
                return;
            }
            if (event.key === "Escape") {
                event.preventDefault();
                closeSheet(true);
                return;
            }
            if (event.key !== "Tab") {
                return;
            }
            var focusable = Array.prototype.slice.call(panel.querySelectorAll('a[href], button:not([disabled]), input:not([disabled])'));
            var first = focusable[0];
            var last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        });
    }

    function placeMobileLang() {
        var lang = document.querySelector(".top-lang");
        var util = document.querySelector(".topbar-util");
        var tools = document.querySelector(".ksl-mobile-sheet-tools");
        if (!lang) {
            return;
        }
        if (mq.matches && tools) {
            if (lang.parentElement !== tools) {
                tools.appendChild(lang);
            }
            return;
        }
        if (util && lang.parentElement !== util) {
            var socials = util.querySelector(".top-socials");
            util.insertBefore(lang, socials);
        }
    }

    function handleViewportChange() {
        if (mq.matches) {
            build();
        } else if (sheet && sheet.classList.contains("is-open")) {
            sheet.classList.remove("is-open");
            sheet.setAttribute("inert", "");
            sheet.setAttribute("aria-hidden", "true");
            menuBtn.setAttribute("aria-expanded", "false");
            document.body.classList.remove("ksl-sheet-open");
        }
        placeMobileLang();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", handleViewportChange);
    } else {
        handleViewportChange();
    }

    if (mq.addEventListener) {
        mq.addEventListener("change", handleViewportChange);
    } else if (mq.addListener) {
        mq.addListener(handleViewportChange);
    }
})();
