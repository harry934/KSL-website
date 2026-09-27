(function () {
    "use strict";

    var mq = window.matchMedia("(max-width: 991.98px)");

    function currentPage() {
        var path = window.location.pathname || "";
        var file = path.split("/").pop();
        return file || "index.html";
    }

    function build() {
        if (!mq.matches || document.querySelector(".ksl-bottom-nav")) {
            return;
        }

        var page = currentPage();
        var iconHome = '<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z"/>';
        var iconService = '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>';
        var iconAbout = '<path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4z"/><path d="M20 21a8 8 0 1 0-16 0"/>';
        var iconGallery = '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10.5" r="1.5"/><path d="m21 17-5-5L5 21"/>';
        var iconMenu = '<line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/>';

        var nav = document.createElement("nav");
        nav.className = "ksl-bottom-nav";
        nav.setAttribute("aria-label", "Primary");

        [
            { href: "index.html", label: "Home", match: ["index.html", ""], icon: iconHome },
            { href: "service.html", label: "Services", match: ["service.html"], icon: iconService },
            { href: "about.html", label: "About", match: ["about.html", "board.html", "organization.html"], icon: iconAbout },
            { href: "videos.html", label: "Gallery", match: ["videos.html"], icon: iconGallery }
        ].forEach(function (tab) {
            var link = document.createElement("a");
            link.href = tab.href;
            if (tab.match.indexOf(page) !== -1) {
                link.classList.add("is-active");
            }
            link.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + tab.icon + "</svg><span>" + tab.label + "</span>";
            nav.appendChild(link);
        });

        var menuBtn = document.createElement("button");
        menuBtn.type = "button";
        menuBtn.id = "kslOpenMobileSheet";
        menuBtn.setAttribute("aria-label", "Open menu");
        menuBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + iconMenu + "</svg><span>Menu</span>";
        nav.appendChild(menuBtn);
        document.body.appendChild(nav);

        var sheet = document.createElement("div");
        sheet.className = "ksl-mobile-sheet";
        sheet.id = "kslMobileSheet";
        sheet.setAttribute("role", "dialog");
        sheet.setAttribute("aria-modal", "true");
        sheet.setAttribute("aria-label", "Site menu");

        var sections = [
            {
                title: "About KSL",
                links: [
                    { href: "about.html", label: "Who We Are" },
                    { href: "board.html", label: "KSL Board" },
                    { href: "organization.html", label: "Organization structure" }
                ]
            },
            {
                title: "Company",
                links: [
                    { href: "products.html", label: "Products" },
                    { href: "project.html", label: "Projects" },
                    { href: "downloads.html", label: "Downloads" },
                    { href: "contact.html", label: "Contact Us" }
                ]
            },
            {
                title: "Media",
                links: [
                    { href: "news.html", label: "News & Events" },
                    { href: "videos.html", label: "Gallery" }
                ]
            },
            {
                title: "More",
                links: [
                    { href: "sustainability.html", label: "Sustainability" },
                    { href: "csr.html", label: "CSR" },
                    { href: "faq.html", label: "FAQ" },
                    { href: "careers.html", label: "Careers" }
                ]
            }
        ];

        var panelHtml = '<div class="ksl-mobile-sheet-panel"><div class="ksl-mobile-sheet-head"><h2>Menu</h2><button type="button" class="ksl-mobile-sheet-close" aria-label="Close menu">&times;</button></div>';
        sections.forEach(function (section) {
            panelHtml += "<section><h3>" + section.title + "</h3>";
            section.links.forEach(function (link) {
                var active = link.href === page ? " is-active" : "";
                panelHtml += '<a class="' + active + '" href="' + link.href + '">' + link.label + "</a>";
            });
            panelHtml += "</section>";
        });
        panelHtml += "</div>";
        sheet.innerHTML = panelHtml;
        document.body.appendChild(sheet);

        var extraPages = ["products.html", "project.html", "downloads.html", "contact.html", "news.html", "sustainability.html", "csr.html", "faq.html", "careers.html"];
        if (extraPages.indexOf(page) !== -1) {
            menuBtn.classList.add("is-active");
        }

        function openSheet() {
            sheet.classList.add("is-open");
            document.body.classList.add("ksl-sheet-open");
        }

        function closeSheet() {
            sheet.classList.remove("is-open");
            document.body.classList.remove("ksl-sheet-open");
        }

        menuBtn.addEventListener("click", openSheet);
        sheet.querySelector(".ksl-mobile-sheet-close").addEventListener("click", closeSheet);
        sheet.addEventListener("click", function (event) {
            if (event.target === sheet) {
                closeSheet();
            }
        });
        sheet.querySelectorAll("a").forEach(function (link) {
            link.addEventListener("click", closeSheet);
        });
        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                closeSheet();
            }
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", build);
    } else {
        build();
    }

    if (mq.addEventListener) {
        mq.addEventListener("change", build);
    } else if (mq.addListener) {
        mq.addListener(build);
    }
})();
