(function ($) {
    "use strict";

    window.kslDocButton = function (href, label) {
        var esc = function (s) {
            return String(s).replace(/[&<>"']/g, function (c) {
                return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
            });
        };
        var svg = 'viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
        return '<a class="download-button" href="' + esc(href) + '" target="_blank" rel="noopener">' +
            '<span class="docs"><svg ' + svg + ' width="20" height="20"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>' + esc(label) + '</span>' +
            '<span class="download"><svg ' + svg + ' width="24" height="24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg></span></a>';
    };

    // Spinner
    var spinner = function () {
        setTimeout(function () {
            if ($('#spinner').length > 0) {
                $('#spinner').removeClass('show');
            }
        }, 1);
    };
    spinner();
    
    
    // Initiate the wowjs
    new WOW().init();


    var topbar = document.querySelector(".topbar-ksl");
    var stickyNav = document.querySelector(".sticky-top");
    var topbarH = 0;
    var lastScrollY = window.scrollY;
    var dockTicking = false;
    var setTucked = function (tucked) {
        topbar.classList.toggle("is-tucked", tucked);
        stickyNav.classList.toggle("is-tucked", tucked);
    };
    var dockNavbar = function () {
        dockTicking = false;
        if (!stickyNav || !topbarH) return;
        var y = window.scrollY;
        var delta = y - lastScrollY;
        stickyNav.classList.toggle("is-compact", y > topbarH);
        if (y <= topbarH || delta < -4) {
            setTucked(false);
        } else if (delta > 4) {
            setTucked(true);
        }
        if (y <= topbarH || Math.abs(delta) > 4) lastScrollY = y;
    };
    var measureTopbar = function () {
        topbarH = topbar ? topbar.offsetHeight : 0;
        document.documentElement.style.setProperty("--ksl-topbar-h", topbarH + "px");
        if (!topbarH && stickyNav) {
            stickyNav.classList.remove("is-compact", "is-tucked");
            if (topbar) topbar.classList.remove("is-tucked");
        }
        dockNavbar();
    };
    measureTopbar();
    window.addEventListener("scroll", function () {
        if (!dockTicking) {
            dockTicking = true;
            window.requestAnimationFrame(dockNavbar);
        }
    }, { passive: true });
    window.addEventListener("resize", measureTopbar);
    window.addEventListener("load", measureTopbar);
    
    
    // Facts counter
    if ($('[data-toggle="counter-up"]').length && $.fn.counterUp) {
        $('[data-toggle="counter-up"]').counterUp({
            delay: 10,
            time: 2000
        });
    }

    // Portfolio isotope and filter
    var $portfolioContainer = $('.portfolio-container');
    if ($portfolioContainer.length && $.fn.isotope) {
        var portfolioIsotope = $portfolioContainer.isotope({
            itemSelector: '.portfolio-item',
            layoutMode: 'fitRows'
        });
        $('#portfolio-flters li').on('click', function () {
            $("#portfolio-flters li").removeClass('active');
            $(this).addClass('active');
            portfolioIsotope.isotope({ filter: $(this).data('filter') });
        });
    }


    // Morph + reveal observer
    if ("IntersectionObserver" in window) {
        var morphObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-morphed");
                    morphObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.35 });

        document.querySelectorAll(".ksl-morph").forEach(function (el) {
            morphObserver.observe(el);
        });

        var revealObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 });

        document.querySelectorAll(".ksl-reveal").forEach(function (el) {
            revealObserver.observe(el);
        });

    } else {
        document.querySelectorAll(".ksl-morph").forEach(function (el) {
            el.classList.add("is-morphed");
        });
        document.querySelectorAll(".ksl-reveal").forEach(function (el) {
            el.classList.add("is-visible");
        });
    }

    var aboutMainImage = document.querySelector(".about-frame-main img");
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    // Where supported, parallax runs as CSS scroll-driven animations on the compositor so layers
    // stay locked to the page during fast scrolling; the rAF handlers below are the fallback.
    var scrollLinked = !reduceMotion.matches && !!(window.CSS && CSS.supports && CSS.supports("animation-timeline: scroll()"));
    var scrollLinks = [];
    var pageTop = function (el) {
        var top = 0;
        var node = el;
        while (node) {
            top += node.offsetTop || 0;
            node = node.offsetParent;
        }
        return top;
    };
    // Maps value(y) = clamp(rate * (y - origin), lo, hi) onto a scroll() timeline range.
    var setScrollRange = function (el, name, rate, origin, lo, hi, unit) {
        var end = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        var clampY = function (y) { return Math.max(0, Math.min(end, y)); };
        var valueAt = function (y) { return Math.max(lo, Math.min(hi, rate * (y - origin))); };
        var start = clampY(origin + lo / rate);
        var stop = clampY(origin + hi / rate);
        if (stop - start < 1) stop = start + 1;
        el.style.setProperty("--ksl-" + name + "-start", start.toFixed(1) + "px");
        el.style.setProperty("--ksl-" + name + "-end", stop.toFixed(1) + "px");
        el.style.setProperty("--ksl-" + name + "-from", valueAt(start).toFixed(4) + unit);
        el.style.setProperty("--ksl-" + name + "-to", valueAt(stop).toFixed(4) + unit);
    };
    var refreshScrollLinks = function () {
        scrollLinks.forEach(function (link) { link(); });
    };
    if (scrollLinked) {
        window.addEventListener("resize", refreshScrollLinks);
        window.addEventListener("load", refreshScrollLinks);
        if ("ResizeObserver" in window) {
            new ResizeObserver(refreshScrollLinks).observe(document.body);
        }
    }

    if (aboutMainImage && scrollLinked) {
        aboutMainImage.classList.add("ksl-scroll-zoom");
        scrollLinks.push(function () {
            var frame = aboutMainImage.parentElement;
            var viewport = window.innerHeight || document.documentElement.clientHeight;
            setScrollRange(aboutMainImage, "zoom", 0.03 / (viewport + frame.offsetHeight), pageTop(frame) - viewport, 0, 0.03, "");
        });
    } else if (aboutMainImage && !reduceMotion.matches) {
        var aboutFrame = aboutMainImage.parentElement;
        var aboutTicking = false;
        var updateAboutZoom = function () {
            var rect = aboutFrame.getBoundingClientRect();
            var viewport = window.innerHeight || document.documentElement.clientHeight;
            var progress = Math.max(0, Math.min(1, (viewport - rect.top) / (viewport + rect.height)));
            aboutMainImage.style.setProperty("--about-zoom", (1 + progress * 0.03).toFixed(3));
            aboutTicking = false;
        };
        var requestAboutZoom = function () {
            if (!aboutTicking) {
                window.requestAnimationFrame(updateAboutZoom);
                aboutTicking = true;
            }
        };
        window.addEventListener("scroll", requestAboutZoom, { passive: true });
        window.addEventListener("resize", requestAboutZoom);
        updateAboutZoom();
    }

    var hero = document.querySelector(".ksl-hero");
    var heroVideo = hero && hero.querySelector(".ksl-hero-video");
    if (hero && heroVideo) {
        var heroVideoStart = parseFloat(heroVideo.getAttribute("data-start"));
        if (!Number.isFinite(heroVideoStart) || heroVideoStart < 0) {
            heroVideoStart = 0;
        }
        var heroVideoAttached = false;
        var heroVideoEnabled = true;

        function homeWillShowIntro() {
            var path = (window.location.pathname || "").split("/").pop() || "index.html";
            var isHome = path === "index.html" || path === "";
            if (!isHome) {
                return false;
            }
            if (/[?&]ksl-intro=1(?:&|$)/.test(window.location.search || "")) {
                return true;
            }
            try {
                return sessionStorage.getItem("ksl-intro-seen") !== "1";
            } catch (e) {
                return false;
            }
        }

        function introIsBlockingHero() {
            var root = document.documentElement;
            if (root.classList.contains("ksl-intro-handoff")) {
                return false;
            }
            return root.classList.contains("ksl-intro-pending") ||
                homeWillShowIntro();
        }

        if (introIsBlockingHero()) {
            heroVideoEnabled = false;
        }

        function enableHeroVideo() {
            if (heroVideoEnabled) {
                return;
            }
            heroVideoEnabled = true;
            if (heroMediaObserver && hero) {
                heroMediaObserver.observe(hero);
            } else {
                playHeroVideo();
            }
        }

        function disableHeroVideoForIntro() {
            heroVideoEnabled = false;
            pauseHeroVideo();
        }

        window.addEventListener("ksl-intro-underlay", enableHeroVideo);
        window.addEventListener("ksl-intro-ended", enableHeroVideo);
        window.addEventListener("ksl-intro-started", disableHeroVideoForIntro);

        function syncHeroVideoWithIntroState() {
            if (!introIsBlockingHero()) {
                enableHeroVideo();
            }
        }
        syncHeroVideoWithIntroState();
        window.addEventListener("load", syncHeroVideoWithIntroState);

        var seekHeroVideoToStart = function () {
            if (heroVideo.duration > heroVideoStart + 0.5) {
                heroVideo.currentTime = heroVideoStart;
            }
        };

        var keepHeroVideoInRange = function () {
            if (heroVideo.duration > heroVideoStart + 0.5 && heroVideo.currentTime < heroVideoStart - 0.25) {
                heroVideo.currentTime = heroVideoStart;
            }
        };

        if (heroVideoStart > 0) {
            heroVideo.addEventListener("loadedmetadata", seekHeroVideoToStart);
            heroVideo.addEventListener("timeupdate", keepHeroVideoInRange);
        }

        var markHeroVideoReady = function () {
            heroVideo.classList.add("is-ready");
        };
        heroVideo.addEventListener("canplay", markHeroVideoReady, { once: true });
        heroVideo.addEventListener("loadeddata", markHeroVideoReady, { once: true });
        heroVideo.addEventListener("error", function () {
            heroVideo.removeAttribute("src");
            heroVideoAttached = false;
        });

        var attachHeroVideo = function () {
            if (!heroVideoEnabled || heroVideoAttached) {
                return;
            }
            heroVideoAttached = true;
            var src = heroVideo.getAttribute("data-src") || heroVideo.getAttribute("src");
            if (src && !heroVideo.getAttribute("src")) {
                if (src.charAt(0) !== "/" && src.indexOf("://") === -1) {
                    src = "/" + src.replace(/^\.\//, "");
                }
                heroVideo.src = src;
                heroVideo.load();
            }
            if (heroVideo.readyState >= 1 && heroVideoStart > 0) {
                seekHeroVideoToStart();
            }
        };

        var playHeroVideo = function () {
            if (!heroVideoEnabled) {
                return;
            }
            attachHeroVideo();
            var playPromise = heroVideo.play();
            if (playPromise && typeof playPromise.catch === "function") {
                playPromise.catch(function () {});
            }
        };

        var pauseHeroVideo = function () {
            heroVideo.pause();
        };

        var heroMediaObserver = null;
        if (reduceMotion.matches) {
            heroVideo.removeAttribute("data-src");
        } else if ("IntersectionObserver" in window) {
            heroMediaObserver = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        playHeroVideo();
                    } else {
                        pauseHeroVideo();
                    }
                });
            }, { threshold: 0.15 });
            if (heroVideoEnabled) {
                heroMediaObserver.observe(hero);
            }
        } else if (heroVideoEnabled) {
            playHeroVideo();
        }

        var heroTicking = false;
        var updateHeroParallax = function () {
            var top = hero.getBoundingClientRect().top;
            var shift = -top * 0.85;
            if (shift > 280) shift = 280;
            if (shift < -280) shift = -280;
            var focus = 18 + Math.max(0, Math.min(42, -top * 0.06));
            if (!scrollLinked) {
                heroVideo.style.transform = "translate3d(0, " + shift.toFixed(2) + "px, 0)";
            }
            heroVideo.style.objectPosition = "center " + Math.min(48, focus).toFixed(1) + "%";
            heroTicking = false;
        };
        var requestHeroParallax = function () {
            if (!heroTicking) {
                window.requestAnimationFrame(updateHeroParallax);
                heroTicking = true;
            }
        };
        window.addEventListener("scroll", requestHeroParallax, { passive: true });
        window.addEventListener("resize", requestHeroParallax);
        updateHeroParallax();
        if (scrollLinked) {
            heroVideo.classList.add("ksl-scroll-linked");
            scrollLinks.push(function () {
                setScrollRange(heroVideo, "sd", 0.85, pageTop(hero), -280, 280, "px");
            });
        }
    }

    var parallaxTargets = document.querySelectorAll("[data-ksl-parallax]");
    if (parallaxTargets.length && !reduceMotion.matches) {
        var defaultParallaxMax = 120;
        var parallaxState = Array.prototype.map.call(parallaxTargets, function (el) {
            var speed = parseFloat(el.getAttribute("data-ksl-parallax"));
            if (!Number.isFinite(speed)) speed = 0;
            var maxShift = parseFloat(el.getAttribute("data-ksl-parallax-max"));
            if (!Number.isFinite(maxShift) || maxShift <= 0) {
                maxShift = defaultParallaxMax;
            }
            return { el: el, speed: speed, maxShift: maxShift };
        });
        var parallaxTicking = false;
        var stackedLayout = window.matchMedia("(max-width: 991.98px)");
        var linkParallax = function () {
            parallaxState.forEach(function (item) {
                item.el.classList.toggle("ksl-scroll-linked", !stackedLayout.matches);
                if (stackedLayout.matches) return;
                var viewport = window.innerHeight || document.documentElement.clientHeight;
                var origin = pageTop(item.el) + item.el.offsetHeight * 0.5 - viewport * 0.5;
                setScrollRange(item.el, "sd", item.speed, origin, -item.maxShift, item.maxShift, "px");
            });
        };
        var updateParallax = function () {
            parallaxTicking = false;
            if (stackedLayout.matches) {
                parallaxState.forEach(function (item) {
                    item.el.style.removeProperty("--ksl-parallax-y");
                });
                return;
            }
            var viewport = window.innerHeight || document.documentElement.clientHeight;
            var scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
            var viewMid = scrollY + viewport * 0.5;
            parallaxState.forEach(function (item) {
                var elMid = pageTop(item.el) + item.el.offsetHeight * 0.5;
                var shift = (viewMid - elMid) * item.speed;
                if (shift > item.maxShift) shift = item.maxShift;
                if (shift < -item.maxShift) shift = -item.maxShift;
                item.el.style.setProperty("--ksl-parallax-y", shift.toFixed(2) + "px");
            });
        };
        var requestParallax = function () {
            if (!parallaxTicking) {
                window.requestAnimationFrame(updateParallax);
                parallaxTicking = true;
            }
        };
        if (scrollLinked) {
            parallaxState = parallaxState.filter(function (item) { return item.speed > 0; });
            scrollLinks.push(linkParallax);
        } else {
            window.addEventListener("scroll", requestParallax, { passive: true });
            window.addEventListener("resize", requestParallax);
            updateParallax();
        }
    }

    var factsBg = document.querySelector(".facts-bg");
    if (factsBg && scrollLinked) {
        factsBg.classList.add("ksl-scroll-linked");
        scrollLinks.push(function () {
            var section = factsBg.parentElement;
            var viewport = window.innerHeight || document.documentElement.clientHeight;
            var slack = section.offsetHeight * 0.32;
            var origin = pageTop(section) + section.offsetHeight / 2 - viewport / 2;
            setScrollRange(factsBg, "sd", 0.42, origin, -slack, slack, "px");
        });
    } else if (factsBg && !reduceMotion.matches) {
        var factsSection = factsBg.parentElement;
        var factsTicking = false;
        var updateFacts = function () {
            var rect = factsSection.getBoundingClientRect();
            var viewport = window.innerHeight || document.documentElement.clientHeight;
            if (rect.bottom < 0 || rect.top > viewport) {
                factsTicking = false;
                return;
            }
            var fromCenter = viewport / 2 - (rect.top + rect.height / 2);
            var slack = rect.height * 0.32;
            var shift = Math.max(-slack, Math.min(slack, fromCenter * 0.42));
            factsBg.style.transform = "translate3d(0, " + shift.toFixed(2) + "px, 0)";
            factsTicking = false;
        };
        var requestFacts = function () {
            if (!factsTicking) {
                window.requestAnimationFrame(updateFacts);
                factsTicking = true;
            }
        };
        window.addEventListener("scroll", requestFacts, { passive: true });
        window.addEventListener("resize", requestFacts);
        updateFacts();
    }

    document.querySelectorAll(".ksl-search").forEach(function (form) {
        var input = form.querySelector('input[type="search"]');
        if (!input) return;
        form.addEventListener("submit", function (event) {
            if (!input.value.trim()) {
                event.preventDefault();
                input.focus();
            }
        });
        input.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                input.value = "";
                input.blur();
            }
        });
    });

    var searchQuery = new URLSearchParams(window.location.search).get("s");
    if (searchQuery && searchQuery.trim()) {
        document.querySelectorAll('.ksl-search input[name="s"]').forEach(function (input) {
            if (!input.value) {
                input.value = searchQuery.trim();
            }
        });
    }

    var currentPage = window.location.pathname.split("/").pop() || "index.html";
    var currentHash = window.location.hash || "";

    function linkMatchesLocation(link) {
        var rawHref = link.getAttribute("href") || "";
        if (!rawHref || rawHref === "#" || /^(?:https?:|mailto:|tel:)/i.test(rawHref)) {
            return false;
        }
        var parts = rawHref.split("#");
        var targetPage = parts[0] || currentPage;
        var targetHash = parts[1] ? "#" + parts[1] : "";
        return targetPage === currentPage && (!targetHash || targetHash === currentHash);
    }

    var navbarNav = document.querySelector(".navbar .navbar-nav");
    if (navbarNav) {
        var navLinks = Array.prototype.slice.call(navbarNav.querySelectorAll(".nav-link, .dropdown-item"));
        navLinks.forEach(function (link) {
            link.classList.remove("active");
            link.removeAttribute("aria-current");
        });

        var currentNavLink = navLinks.filter(function (link) {
            return link.classList.contains("dropdown-item") && linkMatchesLocation(link);
        })[0];
        if (!currentNavLink) {
            currentNavLink = navLinks.filter(function (link) {
                return link.classList.contains("nav-link") && !link.classList.contains("dropdown-toggle") && linkMatchesLocation(link);
            })[0];
        }
        if (!currentNavLink) {
            currentNavLink = navLinks.filter(function (link) {
                return link.classList.contains("nav-link") && linkMatchesLocation(link);
            })[0];
        }
        if (currentNavLink) {
            currentNavLink.classList.add("active");
            currentNavLink.setAttribute("aria-current", "page");
            var currentDropdown = currentNavLink.closest(".nav-item.dropdown");
            if (currentDropdown) {
                var currentToggle = currentDropdown.querySelector(".nav-link.dropdown-toggle");
                if (currentToggle) {
                    currentToggle.classList.add("active");
                }
            }
        }

        var sectionByPage = {
            "about.html": "About KSL",
            "board.html": "About KSL",
            "organization.html": "About KSL",
            "news.html": "Media Center",
            "article.html": "Media Center",
            "event.html": "Media Center",
            "videos.html": "Media Center",
            "downloads.html": "Downloads"
        };
        var activeSection = sectionByPage[currentPage];
        if (activeSection) {
            navbarNav.querySelectorAll(".nav-link.dropdown-toggle").forEach(function (toggle) {
                if (toggle.textContent.trim() === activeSection) {
                    toggle.classList.add("active");
                    if (linkMatchesLocation(toggle) && !currentNavLink) {
                        toggle.setAttribute("aria-current", "page");
                    }
                }
            });
        }
    }

    document.querySelectorAll(".navbar .nav-item.dropdown").forEach(function (item) {
        var toggle = item.querySelector(":scope > .nav-link.dropdown-toggle");
        if (!toggle) {
            return;
        }
        toggle.setAttribute("aria-expanded", "false");
        item.addEventListener("mouseenter", function () {
            if (window.matchMedia("(max-width: 991.98px)").matches) {
                return;
            }
            toggle.setAttribute("aria-expanded", "true");
        });
        item.addEventListener("mouseleave", function () {
            toggle.setAttribute("aria-expanded", "false");
        });
        item.addEventListener("focusin", function () {
            if (window.matchMedia("(max-width: 991.98px)").matches) {
                return;
            }
            toggle.setAttribute("aria-expanded", "true");
        });
        item.addEventListener("focusout", function (event) {
            if (item.contains(event.relatedTarget)) {
                return;
            }
            toggle.setAttribute("aria-expanded", "false");
        });
    });

    document.querySelectorAll(".top-links a").forEach(function (link) {
        link.classList.remove("active");
        link.removeAttribute("aria-current");
        if (linkMatchesLocation(link)) {
            link.classList.add("active");
            link.setAttribute("aria-current", "page");
        }
    });

    document.querySelectorAll(".top-more").forEach(function (moreMenu) {
        var toggle = moreMenu.querySelector(".dropdown-toggle");
        var links = Array.prototype.slice.call(moreMenu.querySelectorAll(".dropdown-item"));
        if (toggle) {
            toggle.classList.remove("active");
        }
        links.forEach(function (link) {
            link.classList.remove("active");
            link.removeAttribute("aria-current");
            if (linkMatchesLocation(link)) {
                link.classList.add("active");
                link.setAttribute("aria-current", "page");
                if (toggle) {
                    toggle.classList.add("active");
                }
            }
        });
    });

    document.querySelectorAll(".product-filters button").forEach(function (btn) {
        btn.addEventListener("click", function () {
            document.querySelectorAll(".product-filters button").forEach(function (b) {
                b.classList.remove("is-on");
                b.setAttribute("aria-pressed", "false");
            });
            btn.classList.add("is-on");
            btn.setAttribute("aria-pressed", "true");
            var filter = btn.getAttribute("data-filter");
            document.querySelectorAll("[data-cat]").forEach(function (el) {
                el.hidden = !(filter === "all" || el.getAttribute("data-cat") === filter);
            });
        });
    });

    document.querySelectorAll("[data-product-toggle]").forEach(function (control) {
        control.addEventListener("click", function () {
            var targetId = control.getAttribute("data-product-toggle");
            var drawer = document.getElementById(targetId);
            if (!drawer) return;

            var willOpen = drawer.hidden;
            drawer.hidden = !willOpen;
            document.querySelectorAll('[aria-controls="' + targetId + '"]').forEach(function (item) {
                item.setAttribute("aria-expanded", willOpen ? "true" : "false");
                if (item.classList.contains("product-details-toggle")) {
                    item.textContent = willOpen ? "Hide details" : "View details";
                }
            });
        });
    });


    var subdropMq = window.matchMedia("(max-width: 991.98px)");
    var subdropCloseTimers = new WeakMap();

    function setSubdropOpen(row, open) {
        if (!row) return;
        var btn = row.querySelector(".ksl-subdrop-arrow");
        if (open) {
            var menu = row.parentElement;
            if (menu) {
                menu.querySelectorAll(".ksl-subdrop.is-open").forEach(function (other) {
                    if (other === row) return;
                    setSubdropOpen(other, false);
                });
            }
            row.classList.add("is-open");
        } else {
            row.classList.remove("is-open");
        }
        if (btn) btn.setAttribute("aria-expanded", open ? "true" : "false");
    }

    function clearSubdropCloseTimer(row) {
        var timer = subdropCloseTimers.get(row);
        if (timer) {
            clearTimeout(timer);
            subdropCloseTimers.delete(row);
        }
    }

    function scheduleSubdropClose(row) {
        clearSubdropCloseTimer(row);
        subdropCloseTimers.set(row, window.setTimeout(function () {
            setSubdropOpen(row, false);
        }, 380));
    }

    function bindSubdropHover(row) {
        var panel = row.querySelector(":scope > .dropdown-menu");
        function openRow() {
            if (subdropMq.matches) return;
            clearSubdropCloseTimer(row);
            setSubdropOpen(row, true);
        }
        function queueCloseRow() {
            if (subdropMq.matches) return;
            scheduleSubdropClose(row);
        }
        row.addEventListener("mouseenter", openRow);
        row.addEventListener("mouseleave", queueCloseRow);
        if (panel) {
            panel.addEventListener("mouseenter", openRow);
            panel.addEventListener("mouseleave", queueCloseRow);
        }
    }

    document.querySelectorAll(".ksl-subdrop").forEach(bindSubdropHover);

    document.querySelectorAll(".ksl-subdrop-arrow").forEach(function (btn) {
        btn.addEventListener("click", function (event) {
            event.preventDefault();
            event.stopPropagation();
            var row = btn.closest(".ksl-subdrop");
            if (!row) return;
            clearSubdropCloseTimer(row);
            setSubdropOpen(row, !row.classList.contains("is-open"));
        });
    });

    document.addEventListener("click", function (event) {
        if (event.target.closest(".ksl-subdrop")) return;
        document.querySelectorAll(".ksl-subdrop.is-open").forEach(function (row) {
            clearSubdropCloseTimer(row);
            setSubdropOpen(row, false);
        });
    });

    document.addEventListener("keydown", function (event) {
        if (event.key !== "Escape") return;
        document.querySelectorAll(".ksl-subdrop.is-open").forEach(function (row) {
            clearSubdropCloseTimer(row);
            setSubdropOpen(row, false);
        });
    });

    var pageHeaders = document.querySelectorAll(".page-header");
    if (pageHeaders.length && scrollLinked) {
        pageHeaders.forEach(function (header) {
            header.classList.add("ksl-scroll-linked-bg");
        });
        scrollLinks.push(function () {
            pageHeaders.forEach(function (header) {
                setScrollRange(header, "sd", 0.18, pageTop(header), -48, 48, "px");
            });
        });
    } else if (pageHeaders.length) {
        var headerTicking = false;
        var updatePageHeaders = function () {
            pageHeaders.forEach(function (header) {
                var top = header.getBoundingClientRect().top;
                var shift = -top * 0.18;
                if (shift > 48) shift = 48;
                if (shift < -48) shift = -48;
                header.style.setProperty("--ksl-header-y", shift.toFixed(2) + "px");
            });
            headerTicking = false;
        };
        var requestPageHeaders = function () {
            if (!headerTicking) {
                window.requestAnimationFrame(updatePageHeaders);
                headerTicking = true;
            }
        };
        window.addEventListener("scroll", requestPageHeaders, { passive: true });
        window.addEventListener("resize", requestPageHeaders);
        updatePageHeaders();
    }

    refreshScrollLinks();

    if (!reduceMotion.matches) {
        document.querySelectorAll("[data-ksl-cycle]").forEach(function (group) {
            var items = group.querySelectorAll(":scope > article, :scope > li");
            if (items.length < 2) return;
            var index = 0;
            var wait = parseInt(group.getAttribute("data-ksl-cycle"), 10) || 4000;
            var timer = window.setInterval(function () {
                items[index].classList.remove("is-on");
                index = (index + 1) % items.length;
                items[index].classList.add("is-on");
            }, wait);
            group.addEventListener("mouseenter", function () {
                window.clearInterval(timer);
            });
        });
    }

    document.querySelectorAll(".why-frame").forEach(function (frame) {
        if (reduceMotion.matches) return;
        var photo = frame.querySelector(".why-photo");
        frame.addEventListener("pointermove", function (event) {
            var rect = frame.getBoundingClientRect();
            var x = (event.clientX - rect.left) / rect.width - 0.5;
            var y = (event.clientY - rect.top) / rect.height - 0.5;
            frame.style.setProperty("--tilt-x", (-y * 7).toFixed(2) + "deg");
            frame.style.setProperty("--tilt-y", (x * 9).toFixed(2) + "deg");
            if (photo) {
                photo.style.setProperty("--pan-x", (x * -16).toFixed(1) + "px");
                photo.style.setProperty("--pan-y", (y * -16).toFixed(1) + "px");
            }
        });
        frame.addEventListener("pointerleave", function () {
            frame.style.removeProperty("--tilt-x");
            frame.style.removeProperty("--tilt-y");
            if (photo) {
                photo.style.removeProperty("--pan-x");
                photo.style.removeProperty("--pan-y");
            }
        });
    });

    document.querySelectorAll(".service-item").forEach(function (card) {
        var readMore = card.querySelector(".ksl-service-more");
        if (card.closest(".ksl-services-grid") && readMore) {
            var showPhoto = function () {
                card.classList.add("is-held");
            };
            var hidePhoto = function () {
                card.classList.remove("is-held");
            };
            readMore.addEventListener("mouseenter", showPhoto);
            readMore.addEventListener("mouseleave", hidePhoto);
            readMore.addEventListener("focus", showPhoto);
            readMore.addEventListener("blur", hidePhoto);
            return;
        }
        if (card.closest(".ksl-services-page-grid")) {
            return;
        }
        var hold = function () {
            card.classList.add("is-held");
        };
        card.addEventListener("mouseenter", hold);
        card.addEventListener("focusin", hold);
    });

    (function kslServiceScrollReveal() {
        var grids = document.querySelectorAll(".ksl-services-grid");
        if (!grids.length) {
            return;
        }
        var pause = 900;
        var step = 380;

        function bindGrid(grid) {
            var cards = Array.prototype.slice.call(grid.querySelectorAll(".service-item"));
            if (!cards.length) {
                return;
            }
            if (grid.hasAttribute("data-ksl-reveal-on-click")) {
                grid.addEventListener("click", function (event) {
                    var more = event.target.closest(".ksl-service-more");
                    var card = more && more.closest(".service-item");
                    if (card) {
                        card.classList.add("is-revealed");
                    }
                });
                return;
            }
            var timers = [];
            var playing = false;

            function clearTimers() {
                timers.forEach(function (id) {
                    window.clearTimeout(id);
                });
                timers = [];
            }

            function resetCards() {
                clearTimers();
                cards.forEach(function (card) {
                    card.classList.remove("is-revealed");
                });
            }

            function revealCards() {
                resetCards();
                if (reduceMotion.matches) {
                    cards.forEach(function (card) {
                        card.classList.add("is-revealed");
                    });
                    return;
                }
                timers.push(window.setTimeout(function () {
                    cards.forEach(function (card, index) {
                        timers.push(window.setTimeout(function () {
                            card.classList.add("is-revealed");
                        }, index * step));
                    });
                }, pause));
            }

            if (!("IntersectionObserver" in window)) {
                revealCards();
                return;
            }

            var revealObserver = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    var visible = entry.isIntersecting && entry.intersectionRatio >= 0.2;
                    if (visible && !playing) {
                        playing = true;
                        revealCards();
                    } else if (!visible && playing) {
                        playing = false;
                        resetCards();
                    }
                });
            }, { threshold: [0, 0.2, 0.5] });

            revealObserver.observe(grid);
        }

        Array.prototype.forEach.call(grids, bindGrid);
    })();

    function kslDecodeHtml(text) {
        if (!text) {
            return "";
        }
        var el = document.createElement("textarea");
        el.innerHTML = text;
        return el.value.replace(/\u00a0/g, " ").trim();
    }

    function kslNormalizeServiceText(text) {
        return (text || "")
            .replace(/\u00a0/g, " ")
            .replace(/[ \t]+\n/g, "\n")
            .replace(/\n{3,}/g, "\n\n")
            .trim();
    }

    var serviceModalEl = document.getElementById("kslServiceModal");
    var showKslServiceModal = function (trigger, cardOverride) {
        if (!serviceModalEl || !trigger) {
            return;
        }
        var card = cardOverride || trigger.closest(".service-item");
        if (card) {
            card.classList.add("is-held");
        }
        var serviceModalTitle = document.getElementById("kslServiceModalTitle");
        var serviceModalSummary = document.getElementById("kslServiceModalSummary");
        var serviceModalBody = document.getElementById("kslServiceModalBody");
        var serviceModalLink = document.getElementById("kslServiceModalLink");
        var serviceModalImg = document.getElementById("kslServiceModalImg");
        var serviceModalDownloads = document.getElementById("kslServiceModalDownloads");
        var serviceModalDownloadsList = document.getElementById("kslServiceModalDownloadsList");
        var title = trigger.getAttribute("data-ksl-title") || "";
        var detail = trigger.getAttribute("data-ksl-detail") || "";
        var summaryNode = card && (card.querySelector(".ksl-service-excerpt") || card.querySelector(".service-text > p"));
        var imgNode = card && card.querySelector(".service-img img");
        var slug = trigger.getAttribute("data-ksl-slug");
        var catalog = window.kslServicesCatalog;
        var item = slug && window.kslServicesBySlug ? window.kslServicesBySlug[slug] : null;

        if (item) {
            title = item.title || title;
            detail = item.detail || detail;
            if (item.excerpt) {
                summaryNode = null;
            }
            if (item.image && serviceModalImg) {
                serviceModalImg.src = item.image;
                serviceModalImg.alt = item.title || "";
            }
        }

        if (serviceModalTitle) {
            serviceModalTitle.textContent = kslDecodeHtml(title);
        }
        var summaryText = item && item.excerpt
            ? item.excerpt
            : (summaryNode ? summaryNode.textContent.trim() : "");
        summaryText = kslNormalizeServiceText(kslDecodeHtml(summaryText));
        if (serviceModalSummary) {
            if (summaryText) {
                serviceModalSummary.textContent = summaryText;
                serviceModalSummary.classList.remove("d-none");
            } else {
                serviceModalSummary.textContent = "";
                serviceModalSummary.classList.add("d-none");
            }
        }
        if (serviceModalBody) {
            detail = kslNormalizeServiceText(kslDecodeHtml(detail));
            var parts = detail.split(/\n\n+/).filter(function (p) {
                return p && p.length > 1 && !/^our .+ services include:?\s*$/i.test(p);
            });
            serviceModalBody.innerHTML = parts.map(function (p) {
                var para = document.createElement("p");
                para.textContent = p;
                return para.outerHTML;
            }).join("");
        }
        var scrollRegion = serviceModalEl && serviceModalEl.querySelector(".ksl-service-modal-scroll");
        if (scrollRegion) {
            scrollRegion.scrollTop = 0;
        }
        if (serviceModalLink) {
            serviceModalLink.href = trigger.getAttribute("data-ksl-link") || "contact.html";
            serviceModalLink.textContent = trigger.getAttribute("data-ksl-link-label") || "Request a quote";
        }
        if (serviceModalImg && imgNode && !(item && item.image)) {
            serviceModalImg.src = imgNode.getAttribute("src") || "";
            serviceModalImg.alt = imgNode.getAttribute("alt") || title;
        }

        if (serviceModalDownloads && serviceModalDownloadsList) {
            serviceModalDownloadsList.innerHTML = "";
            var downloadIds = item && item.downloads ? item.downloads : [];
            var downloadCatalog = catalog && catalog.downloadCatalog ? catalog.downloadCatalog : {};
            if (downloadIds.length) {
                downloadIds.forEach(function (id) {
                    var file = downloadCatalog[id];
                    if (!file) {
                        return;
                    }
                    var li = document.createElement("li");
                    li.innerHTML = window.kslDocButton(file.href, file.title);
                    serviceModalDownloadsList.appendChild(li);
                });
                serviceModalDownloads.classList.remove("d-none");
            } else {
                serviceModalDownloads.classList.add("d-none");
            }
        }

        var ModalApi = window.bootstrap && window.bootstrap.Modal;
        if (ModalApi) {
            var instance = typeof ModalApi.getOrCreateInstance === "function"
                ? ModalApi.getOrCreateInstance(serviceModalEl)
                : new ModalApi(serviceModalEl);
            instance.show();
            return;
        }

        serviceModalEl.classList.add("show");
        serviceModalEl.style.display = "block";
        serviceModalEl.removeAttribute("aria-hidden");
        serviceModalEl.setAttribute("aria-modal", "true");
        document.body.classList.add("modal-open");
        if (!document.getElementById("kslServiceModalBackdrop")) {
            var backdrop = document.createElement("div");
            backdrop.className = "modal-backdrop fade show";
            backdrop.id = "kslServiceModalBackdrop";
            document.body.appendChild(backdrop);
        }
    };

    window.showKslServiceModal = showKslServiceModal;

    document.addEventListener("click", function (event) {
        var trigger = event.target.closest(".ksl-service-more");
        if (!trigger) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        showKslServiceModal(trigger);
    });

    var heroReveal = document.querySelector(".ksl-hero");
    if (heroReveal) {
        var revealHero = function (fromIntro) {
            if (heroReveal.classList.contains("is-revealed")) {
                return;
            }
            if (fromIntro) {
                heroReveal.classList.add("is-intro-crossfade");
            }
            window.requestAnimationFrame(function () {
                heroReveal.classList.add("is-revealed");
            });
        };
        var introRoot = document.documentElement;
        if (introRoot.classList.contains("ksl-intro-active") || introRoot.classList.contains("ksl-intro-pending")) {
            window.addEventListener("ksl-intro-ended", function () {
                revealHero(true);
            }, { once: true });
        } else {
            revealHero(false);
        }
    }

    var heroValues = document.querySelector(".ksl-hero-values");
    if (heroValues) {
        if ("IntersectionObserver" in window) {
            new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.intersectionRatio >= 0.35) {
                        heroValues.classList.add("is-inview");
                    } else if (!entry.isIntersecting) {
                        heroValues.classList.remove("is-inview");
                    }
                });
            }, { threshold: [0, 0.35] }).observe(heroValues);
        } else {
            heroValues.classList.add("is-inview");
        }
        initHeroWave(heroValues);
    }

    function initHeroWave(band) {
        var bg = band.querySelector(".ksl-hero-wave-bg");
        var swellPath = band.querySelector(".ksl-wave-swell");
        var linePath = band.querySelector(".ksl-wave-line");
        var glint = band.querySelector("#kslWaveGlint");
        var foamGroup = band.querySelector(".ksl-wave-foam");
        var draft = band.querySelector(".ksl-wave-draft");
        var bubbleLayer = band.querySelector(".ksl-hero-bubbles");
        var shorePath = band.querySelector(".ksl-shore-fill");
        if (!bg || !swellPath || !linePath) {
            return;
        }
        var NS = "http://www.w3.org/2000/svg";
        var STEP = 6;
        var BASE = 28;
        var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
        var mobileQuery = window.matchMedia("(max-width: 767.98px)");
        var width = 0;
        var height = 0;
        var mobile = false;
        var amp = 1;
        var foam = [];
        var bubbles = [];
        var lastNow = 0;
        var ripples = [];
        var lastRipple = { x: -999, t: 0 };
        var lift = { x: 0, goal: 0, amp: 0, target: 0 };
        var start = performance.now();
        var visible = true;
        var frame = 0;

        function clamp(v, lo, hi) {
            return Math.max(lo, Math.min(hi, v));
        }

        function frontY(x, t) {
            var k = mobile ? 1.7 : 1;
            var y = Math.sin(x / (38 * k) + t * 0.55) * 5.5 +
                Math.sin(x / (115 * k) + 0.9 + t * 0.21) * 4 +
                Math.sin(x / (19 * k) + 0.4 + t * 1.1) * 1.2;
            y *= amp * (mobile ? 0.6 : 1);
            for (var i = 0; i < ripples.length; i++) {
                var r = ripples[i];
                var dt = t - r.t;
                var d = x - r.x;
                var spread = 30 + dt * 140;
                y -= 6 * Math.exp(-dt * 1.4) * Math.cos(d / 14 - dt * 9) * Math.exp(-(d * d) / (2 * spread * spread));
            }
            if (lift.amp > 0.001) {
                var dl = x - lift.x;
                y -= lift.amp * 9 * Math.exp(-(dl * dl) / (2 * 70 * 70));
            }
            return BASE + y;
        }

        function swellY(x, t) {
            var k = mobile ? 1.7 : 1;
            var y = Math.sin(x / (70 * k) - t * 0.3) * 7 + Math.sin(x / (160 * k) + 2 - t * 0.12) * 4;
            return BASE - 11 + y * amp * (mobile ? 0.6 : 1);
        }

        function buildFoam() {
            while (foamGroup.firstChild) {
                foamGroup.removeChild(foamGroup.firstChild);
            }
            foam = [];
            var count = Math.floor(width / 55);
            for (var i = 0; i < count; i++) {
                var el = document.createElementNS(NS, "circle");
                el.setAttribute("r", (0.8 + Math.random() * 0.9).toFixed(2));
                foamGroup.appendChild(el);
                foam.push({ x: i * 55 + Math.random() * 30, seed: Math.random() * 6.28, el: el });
            }
        }

        function spawnBubble(b, anywhere) {
            b.x = Math.random() * width;
            b.y = anywhere ? BASE + Math.random() * (height - BASE) : height - 14 - Math.random() * 10;
            b.speed = 12 + Math.random() * 16;
            b.phase = Math.random() * 6.28;
            b.el.setAttribute("r", (1.2 + Math.random() * 1.8).toFixed(2));
        }

        function buildBubbles() {
            if (!bubbleLayer) {
                return;
            }
            while (bubbleLayer.firstChild) {
                bubbleLayer.removeChild(bubbleLayer.firstChild);
            }
            bubbles = [];
            if (reduceMotion.matches) {
                return;
            }
            var count = Math.max(3, Math.floor(width / 220));
            for (var i = 0; i < count; i++) {
                var el = document.createElementNS(NS, "circle");
                bubbleLayer.appendChild(el);
                var b = { el: el };
                spawnBubble(b, true);
                bubbles.push(b);
            }
        }

        function shoreY(x, t) {
            var k = mobile ? 1.6 : 1;
            return 12 + Math.sin(x / (90 * k) - t * 0.4) * 3.5 + Math.sin(x / (37 * k) + t * 0.7) * 1.2;
        }

        function targetAmp() {
            var rect = band.getBoundingClientRect();
            var vh = window.innerHeight;
            if (rect.bottom <= vh) {
                return 1;
            }
            var progress = clamp((vh - rect.top) / rect.height, 0, 1);
            return 1 + (1 - progress) * 0.8;
        }

        function draw(now) {
            var t = (now - start) / 1000;
            var dt = lastNow ? Math.min((now - lastNow) / 1000, 0.1) : 0;
            lastNow = now;
            amp += (targetAmp() - amp) * 0.06;
            lift.amp += (lift.target - lift.amp) * 0.08;
            lift.x += (lift.goal - lift.x) * 0.12;
            ripples = ripples.filter(function (r) { return t - r.t < 2.5; });

            var line = "";
            var clip = "";
            var swellTop = "";
            var swellBottom = [];
            var minY = Infinity;
            var maxY = -Infinity;
            for (var x = 0; x <= width + STEP; x += STEP) {
                var px = Math.min(x, width);
                var fy = frontY(px, t);
                var sy = Math.min(swellY(px, t), fy);
                minY = Math.min(minY, fy);
                maxY = Math.max(maxY, fy);
                var seg = (x === 0 ? "M" : "L") + px.toFixed(1) + " " + fy.toFixed(2);
                line += seg;
                clip += seg;
                swellTop += (x === 0 ? "M" : "L") + px.toFixed(1) + " " + sy.toFixed(2);
                swellBottom.unshift("L" + px.toFixed(1) + " " + fy.toFixed(2));
                if (px === width) {
                    break;
                }
            }
            linePath.setAttribute("d", line);
            swellPath.setAttribute("d", swellTop + swellBottom.join("") + "Z");
            var shape = "path('" + clip + "L" + width + " " + height + "L0 " + height + "Z')";
            bg.style.clipPath = shape;
            bg.style.webkitClipPath = shape;
            if (glint) {
                glint.setAttribute("y1", minY.toFixed(1));
                glint.setAttribute("y2", maxY.toFixed(1));
            }

            for (var i = 0; i < foam.length; i++) {
                var f = foam[i];
                var fx = ((f.x - t * 12) % width + width) % width;
                var crestY = frontY(fx, t);
                var crest = clamp((BASE - crestY) / (7 * amp), 0, 1);
                var twinkle = 0.5 + 0.5 * Math.sin(t * 2 + f.seed);
                f.el.setAttribute("cx", fx.toFixed(1));
                f.el.setAttribute("cy", (crestY - 2).toFixed(1));
                f.el.setAttribute("opacity", (crest * crest * twinkle * 0.85).toFixed(2));
            }

            if (shorePath) {
                var shore = "";
                for (var sx = 0; sx <= width + STEP * 2; sx += STEP * 2) {
                    var spx = Math.min(sx, width);
                    shore += (sx === 0 ? "M" : "L") + spx.toFixed(1) + " " + shoreY(spx, t).toFixed(2);
                    if (spx === width) {
                        break;
                    }
                }
                shorePath.setAttribute("d", shore + "L" + width + " 25L0 25Z");
            }

            for (var j = 0; j < bubbles.length; j++) {
                var b = bubbles[j];
                b.y -= b.speed * dt;
                b.x += Math.sin(t * 1.6 + b.phase) * 0.25;
                var surface = frontY(b.x, t) + 4;
                if (b.y <= surface) {
                    spawnBubble(b, false);
                }
                var fadeTop = clamp((b.y - surface) / 30, 0, 1);
                var fadeBottom = clamp((height - 12 - b.y) / 20, 0, 1);
                b.el.setAttribute("cx", b.x.toFixed(1));
                b.el.setAttribute("cy", b.y.toFixed(1));
                b.el.setAttribute("opacity", (fadeTop * fadeBottom * 0.6).toFixed(2));
            }
        }

        function tick(now) {
            frame = 0;
            draw(now);
            if (visible && !document.hidden && !reduceMotion.matches) {
                frame = window.requestAnimationFrame(tick);
            }
        }

        function play() {
            if (!frame && !reduceMotion.matches) {
                frame = window.requestAnimationFrame(tick);
            }
        }

        function measure() {
            width = bg.clientWidth;
            height = bg.clientHeight;
            mobile = mobileQuery.matches;
            if (draft) {
                draft.setAttribute("transform", "translate(" + (width - 30) + " 0)");
            }
            buildFoam();
            buildBubbles();
            draw(performance.now());
        }

        band.classList.add("is-wave-live");
        measure();

        if ("ResizeObserver" in window) {
            new ResizeObserver(measure).observe(band);
        } else {
            window.addEventListener("resize", measure);
        }

        if ("IntersectionObserver" in window) {
            new IntersectionObserver(function (entries) {
                visible = entries[0].isIntersecting;
                if (visible) {
                    play();
                }
            }).observe(band);
        }

        document.addEventListener("visibilitychange", function () {
            if (!document.hidden) {
                play();
            }
        });

        band.addEventListener("pointermove", function (event) {
            if (event.pointerType !== "mouse" || reduceMotion.matches) {
                return;
            }
            var x = event.clientX - band.getBoundingClientRect().left;
            var t = (performance.now() - start) / 1000;
            if (Math.abs(x - lastRipple.x) < 50 && t - lastRipple.t < 0.18) {
                return;
            }
            lastRipple = { x: x, t: t };
            ripples.push(lastRipple);
            if (ripples.length > 6) {
                ripples.shift();
            }
        });

        function raiseOver(item) {
            var itemRect = item.getBoundingClientRect();
            lift.goal = itemRect.left + itemRect.width / 2 - band.getBoundingClientRect().left;
            if (lift.amp < 0.05) {
                lift.x = lift.goal;
            }
            lift.target = 1;
        }

        function lower() {
            lift.target = 0;
        }

        band.querySelectorAll(".ksl-values-grid article").forEach(function (item) {
            item.addEventListener("mouseenter", function () { raiseOver(item); });
            item.addEventListener("mouseleave", lower);
            item.addEventListener("focusin", function () { raiseOver(item); });
            item.addEventListener("focusout", lower);
        });

        play();
    }

    // Gallery page: load photos + category filter
    var galleryRoot = document.getElementById("ksl-gallery-grid");
    if (galleryRoot) {
        var galleryFilter = "all";
        var galleryPhotos = [];

        var renderGallery = function () {
            galleryRoot.innerHTML = "";
            var visible = 0;
            galleryPhotos.forEach(function (photo) {
                var cat = photo.category || "all";
                if (galleryFilter !== "all" && cat !== galleryFilter) {
                    return;
                }
                visible += 1;
                var fig = document.createElement("figure");
                fig.className = "ksl-gallery-item";
                fig.setAttribute("data-category", cat);
                var link = document.createElement("a");
                link.href = photo.src;
                link.setAttribute("data-lightbox", "ksl-gallery");
                link.setAttribute("data-title", photo.title || "");
                var img = document.createElement("img");
                img.src = photo.src;
                img.alt = photo.title || "Kenya Shipyards Limited gallery";
                img.loading = "lazy";
                img.decoding = "async";
                link.appendChild(img);
                fig.appendChild(link);
                if (photo.title) {
                    var cap = document.createElement("figcaption");
                    cap.textContent = photo.title;
                    fig.appendChild(cap);
                }
                galleryRoot.appendChild(fig);
            });
            if (!visible) {
                galleryRoot.innerHTML = '<section class="ksl-empty-state" role="status"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"></rect><circle cx="8.5" cy="10" r="1.5"></circle><path d="m21 16-5.2-5.2a1.2 1.2 0 0 0-1.7 0L8 17"></path></svg><h3>No photos in this category</h3><p>Try another filter or view the full gallery.</p><div class="ksl-empty-state-actions"><button class="btn btn-primary" type="button" data-gallery-all>View all photos</button></div></section>';
            }
        };

        galleryRoot.addEventListener("click", function (event) {
            if (!event.target.closest("[data-gallery-all]")) {
                return;
            }
            galleryFilter = "all";
            document.querySelectorAll(".ksl-gallery-filters [data-ksl-gallery-filter]").forEach(function (btn) {
                btn.classList.toggle("is-active", (btn.getAttribute("data-ksl-gallery-filter") || "all") === "all");
            });
            renderGallery();
        });

        var videoMount = document.getElementById("ksl-gallery-videos");
        var featureMount = document.getElementById("ksl-video-feature");
        var renderVideos = function (videos) {
            if (!videos || !videos.length) {
                return;
            }
            var featured = videos.find(function (v) { return v.featured; }) || videos[0];
            var rest = videos.filter(function (v) { return v !== featured; });
            function mountPlayer(parent, video) {
                if (!parent || !video || !video.youtubeId) {
                    return;
                }
                parent.innerHTML = "";
                var iframe = document.createElement("iframe");
                iframe.src = "https://www.youtube.com/embed/" + video.youtubeId;
                iframe.title = video.title || "Kenya Shipyards Limited video";
                iframe.loading = "lazy";
                iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
                iframe.allowFullscreen = true;
                parent.appendChild(iframe);
            }
            mountPlayer(featureMount, featured);
            if (!videoMount) {
                return;
            }
            videoMount.innerHTML = "";
            rest.forEach(function (video) {
                var card = document.createElement("article");
                card.className = "ksl-video-card";
                var wrap = document.createElement("div");
                wrap.className = "ratio ratio-16x9";
                mountPlayer(wrap, video);
                card.appendChild(wrap);
                if (video.title) {
                    var h = document.createElement("h3");
                    h.textContent = video.title;
                    card.appendChild(h);
                }
                if (video.caption) {
                    var p = document.createElement("p");
                    p.className = "ksl-video-caption";
                    p.textContent = video.caption;
                    card.appendChild(p);
                }
                videoMount.appendChild(card);
            });
        };

        document.querySelectorAll(".ksl-gallery-filters [data-ksl-gallery-filter]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                document.querySelectorAll(".ksl-gallery-filters [data-ksl-gallery-filter]").forEach(function (b) {
                    b.classList.remove("is-active");
                });
                btn.classList.add("is-active");
                galleryFilter = btn.getAttribute("data-ksl-gallery-filter") || "all";
                renderGallery();
            });
        });

        fetch("data/gallery.json")
            .then(function (res) { return res.json(); })
            .then(function (data) {
                galleryPhotos = data.photos || [];
                renderGallery();
                renderVideos(data.videos || []);
            })
            .catch(function () {
                galleryRoot.innerHTML = '<section class="ksl-empty-state" role="status"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"></rect><circle cx="8.5" cy="10" r="1.5"></circle><path d="m21 16-5.2-5.2a1.2 1.2 0 0 0-1.7 0L8 17"></path></svg><h3>Gallery is unavailable</h3><p>Check your connection, then refresh the page.</p><div class="ksl-empty-state-actions"><button class="btn btn-primary" type="button" onclick="window.location.reload()">Try again</button></div></section>';
            });
    }

    if (window.bootstrap && window.bootstrap.Dropdown) {
        document.querySelectorAll(".top-more .dropdown-toggle").forEach(function (toggle) {
            toggle.addEventListener("click", function (event) {
                event.preventDefault();
            });
            if (typeof window.bootstrap.Dropdown.getOrCreateInstance === "function") {
                window.bootstrap.Dropdown.getOrCreateInstance(toggle);
            } else if (!window.bootstrap.Dropdown.getInstance(toggle)) {
                new window.bootstrap.Dropdown(toggle);
            }
        });
    }

    // Testimonials carousel
    if ($(".testimonial-carousel").length && $.fn.owlCarousel) {
        $(".testimonial-carousel").owlCarousel({
            autoplay: true,
            smartSpeed: 1000,
            items: 1,
            dots: false,
            loop: true,
            nav: true,
            navText: [
                '<i class="bi bi-chevron-left"></i>',
                '<i class="bi bi-chevron-right"></i>'
            ]
        });
    }

    // Live search suggestions for every site search box
    var searchIndex = null;
    var searchIndexLoading = null;
    var SEARCH_PAGES = [
        { title: "Home", href: "index.html", type: "Page", keys: "kenya shipyards limited" },
        { title: "Who We Are", href: "about.html", type: "Page", keys: "about ksl vision mission mandate history iso" },
        { title: "KSL Board", href: "board.html", type: "Page", keys: "directors chairman leadership" },
        { title: "Organization Structure", href: "organization.html", type: "Page", keys: "management departments" },
        { title: "Services", href: "service.html", type: "Page", keys: "shipbuilding repair refit engineering" },
        { title: "Products", href: "products.html", type: "Page", keys: "boats vessels grp patrol ferry" },
        { title: "Projects", href: "project.html", type: "Page", keys: "vessels delivered builds" },
        { title: "News and Events", href: "news.html", type: "Page", keys: "media press updates" },
        { title: "Gallery", href: "videos.html", type: "Page", keys: "photos videos media" },
        { title: "Downloads", href: "downloads.html", type: "Page", keys: "documents forms charter tender" },
        { title: "Careers", href: "careers.html", type: "Page", keys: "jobs vacancies internship attachment" },
        { title: "FAQ", href: "faq.html", type: "Page", keys: "questions help" },
        { title: "CSR", href: "csr.html", type: "Page", keys: "community social responsibility" },
        { title: "Sustainability", href: "sustainability.html", type: "Page", keys: "environment green" },
        { title: "Contact Us", href: "contact.html", type: "Page", keys: "email phone address quote mombasa kisumu nairobi herufi house head office" },
        { title: "Our yards", href: "index.html#yards", type: "Page", keys: "map location directions mombasa mtongwe kisumu nairobi herufi house headquarters" },
        { title: "Shipyard Specifications", href: "about.html#yards", type: "Page", keys: "slipway dry dock graving dock cranes quay capacity tonnes" },
        { title: "7.05 m Ambulance Boat", href: "products.html", type: "Product", keys: "medical ambulance boat 13 m" },
        { title: "15 Ton Medium Scale Fishing Vessel", href: "products.html", type: "Product", keys: "fishing artisanal boat 30 ton" },
        { title: "16 m Passenger Boat", href: "products.html", type: "Product", keys: "passenger ferry 29.05 m vip admiral barge" },
        { title: "Patrol, pilot, and landing craft", href: "products.html", type: "Product", keys: "utility rhib dredger pier linkspan" }
    ];

    function escapeHtml(text) {
        return String(text).replace(/[&<>"']/g, function (ch) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[ch];
        });
    }

    function loadSearchIndex() {
        if (searchIndexLoading) {
            return searchIndexLoading;
        }
        function grab(url) {
            return fetch(url).then(function (res) { return res.json(); }).catch(function () { return null; });
        }
        searchIndexLoading = Promise.all([
            grab("data/news.json"),
            grab("data/services.json"),
            grab("data/faq.json"),
            grab("data/events.json"),
            grab("data/downloads.json"),
            grab("data/careers.json"),
            grab("data/organization.json"),
            grab("data/gallery.json")
        ]).then(function (results) {
            var list = SEARCH_PAGES.slice();
            var news = results[0];
            var services = results[1];
            var faq = results[2];
            var events = results[3];
            var downloads = results[4];
            var careers = results[5];
            var org = results[6];
            var gallery = results[7];
            ((downloads && downloads.items) || []).forEach(function (item) {
                list.push({ title: item.title, href: "downloads.html", type: "Document", keys: (item.categoryLabel || "") + " " + (item.type || "") });
            });
            ((careers && careers.vacancies) || []).concat((careers && careers.internships) || []).forEach(function (item) {
                list.push({ title: item.title, href: "careers.html", type: "Career", keys: (item.location || "") + " " + (item.summary || "") });
            });
            ((org && org.leadership) || []).forEach(function (item) {
                list.push({ title: item.role, href: "organization.html", type: "People", keys: item.summary || "" });
            });
            ((gallery && gallery.videos) || []).forEach(function (item) {
                list.push({ title: item.title, href: "videos.html", type: "Video", keys: item.caption || "" });
            });
            ((news && news.items) || []).forEach(function (item) {
                list.push({ title: item.title, href: "article.html?slug=" + encodeURIComponent(item.slug), type: "News", keys: item.excerpt || "" });
            });
            ((services && services.items) || []).forEach(function (item) {
                list.push({ title: item.title, href: "service.html", type: "Service", keys: (item.category || "") + " " + (item.excerpt || "") });
            });
            ((faq && faq.groups) || []).forEach(function (group) {
                (group.items || []).forEach(function (item) {
                    list.push({ title: item.q, href: "faq.html", type: "FAQ", keys: group.title || "" });
                });
            });
            ((events && events.upcoming) || []).concat((events && events.past) || []).forEach(function (item) {
                list.push({ title: item.title, href: item.href || "event.html", type: "Event", keys: (item.venue || "") + " " + (item.theme || "") });
            });
            searchIndex = list;
            return list;
        });
        return searchIndexLoading;
    }

    function searchMatches(query) {
        var words = query.toLowerCase().split(/\s+/).filter(Boolean);
        if (!words.length || !searchIndex) {
            return [];
        }
        return searchIndex.map(function (item) {
            var title = item.title.toLowerCase();
            var hay = title + " " + item.keys.toLowerCase();
            if (!words.every(function (w) { return hay.indexOf(w) !== -1; })) {
                return null;
            }
            var score = title.indexOf(words[0]) === 0 ? 3 : title.indexOf(words[0]) !== -1 ? 2 : 1;
            if (item.type === "Page") {
                score += 0.5;
            }
            return { item: item, score: score };
        }).filter(Boolean).sort(function (a, b) {
            return b.score - a.score;
        }).slice(0, 6).map(function (match) {
            return match.item;
        });
    }

    function highlight(title, query) {
        var safe = escapeHtml(title);
        var first = query.trim().split(/\s+/)[0];
        if (!first) {
            return safe;
        }
        var pattern = new RegExp("(" + first.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "ig");
        return safe.replace(pattern, "<mark>$1</mark>");
    }

    var suggestCount = 0;

    function suggestBoxFor(input) {
        var host = input.parentElement;
        var box = host.querySelector(".ksl-suggest");
        if (!box) {
            suggestCount += 1;
            box = document.createElement("div");
            box.className = "ksl-suggest";
            box.id = "ksl-suggest-" + suggestCount;
            box.setAttribute("role", "listbox");
            box.hidden = true;
            host.classList.add("ksl-suggest-host");
            host.appendChild(box);
            input.setAttribute("role", "combobox");
            input.setAttribute("aria-autocomplete", "list");
            input.setAttribute("aria-controls", box.id);
            input.setAttribute("aria-expanded", "false");
            input.setAttribute("autocomplete", "off");
            box.addEventListener("mousedown", function (event) {
                event.preventDefault();
            });
        }
        return box;
    }

    function closeSuggest(input) {
        var box = suggestBoxFor(input);
        box.hidden = true;
        box.classList.remove("is-open");
        box.parentElement.classList.remove("is-suggesting");
        input.setAttribute("aria-expanded", "false");
        input.removeAttribute("aria-activedescendant");
    }

    function renderSuggest(input) {
        var box = suggestBoxFor(input);
        var query = input.value.trim();
        if (query.length < 2) {
            closeSuggest(input);
            return;
        }
        var results = searchMatches(query);
        if (!results.length) {
            box.innerHTML = '<p class="ksl-suggest-empty">No quick matches. Press Enter to search news.</p>';
        } else {
            box.innerHTML = results.map(function (item, i) {
                return '<a class="ksl-suggest-item" role="option" id="' + box.id + '-' + i + '" href="' + escapeHtml(item.href) + '">' +
                    '<span class="ksl-suggest-type">' + item.type + '</span>' +
                    '<span class="ksl-suggest-title">' + highlight(item.title, query) + '</span></a>';
            }).join("");
        }
        box.hidden = false;
        box.parentElement.classList.add("is-suggesting");
        window.requestAnimationFrame(function () {
            box.classList.add("is-open");
        });
        input.setAttribute("aria-expanded", "true");
    }

    function isSiteSearch(el) {
        return el && el.matches && el.matches('input[name="s"], #kslMobileSearch');
    }

    document.addEventListener("input", function (event) {
        var input = event.target;
        if (!isSiteSearch(input)) {
            return;
        }
        loadSearchIndex().then(function () {
            renderSuggest(input);
        });
    });

    document.addEventListener("focusin", function (event) {
        if (isSiteSearch(event.target)) {
            loadSearchIndex();
        }
    });

    document.addEventListener("submit", function (event) {
        var input = event.target.querySelector('input[name="s"], #kslMobileSearch');
        if (!input || !input.parentElement.querySelector(".ksl-suggest")) {
            return;
        }
        var first = suggestBoxFor(input).querySelector(".ksl-suggest-item.is-active, .ksl-suggest-item");
        if (first) {
            event.preventDefault();
            window.location.href = first.getAttribute("href");
        }
    });

    document.addEventListener("focusout", function (event) {
        if (isSiteSearch(event.target)) {
            closeSuggest(event.target);
        }
    });

    document.addEventListener("keydown", function (event) {
        var input = event.target;
        if (!isSiteSearch(input)) {
            return;
        }
        var box = suggestBoxFor(input);
        var items = box.hidden ? [] : Array.prototype.slice.call(box.querySelectorAll(".ksl-suggest-item"));
        var current = box.querySelector(".ksl-suggest-item.is-active");
        var index = items.indexOf(current);
        if (event.key === "Escape") {
            closeSuggest(input);
            return;
        }
        if ((event.key === "ArrowDown" || event.key === "ArrowUp") && items.length) {
            event.preventDefault();
            index = event.key === "ArrowDown" ? (index + 1) % items.length : (index - 1 + items.length) % items.length;
            items.forEach(function (el) { el.classList.remove("is-active"); });
            items[index].classList.add("is-active");
            input.setAttribute("aria-activedescendant", items[index].id);
            return;
        }
        if (event.key === "Enter" && (current || items.length)) {
            event.preventDefault();
            window.location.href = (current || items[0]).getAttribute("href");
        }
    });

    // Photo viewer: wrap-around, quicker fades, swipe on touch screens
    if (window.lightbox && typeof window.lightbox.option === "function") {
        window.lightbox.option({
            wrapAround: true,
            fadeDuration: 300,
            imageFadeDuration: 300,
            resizeDuration: 380,
            albumLabel: "%1 / %2"
        });
    }

    var swipeStart = null;
    document.addEventListener("touchstart", function (event) {
        if (!event.target.closest("#lightbox") || event.touches.length !== 1) {
            swipeStart = null;
            return;
        }
        swipeStart = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    }, { passive: true });

    document.addEventListener("touchend", function (event) {
        if (!swipeStart) {
            return;
        }
        var dx = event.changedTouches[0].clientX - swipeStart.x;
        var dy = event.changedTouches[0].clientY - swipeStart.y;
        swipeStart = null;
        if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) {
            return;
        }
        var target = document.querySelector(dx < 0 ? "#lightbox .lb-next" : "#lightbox .lb-prev");
        if (target && target.offsetParent !== null) {
            target.click();
        }
    }, { passive: true });

    // Contact form: live ticks, then a ship sails off and the email app opens
    var contactForm = document.querySelector(".ksl-contact-form");
    if (contactForm) {
        var contactFields = contactForm.querySelectorAll(".form-control");
        var contactError = contactForm.querySelector(".ksl-send-error");
        var contactOk = contactForm.querySelector(".ksl-send-ok");
        var contactBtn = contactForm.querySelector(".ksl-send-btn");

        var markField = function (field) {
            var filled = field.value.trim() !== "";
            var valid = field.checkValidity() && (filled || !field.required);
            field.classList.toggle("is-valid", valid && filled);
            field.classList.toggle("is-invalid", !valid);
        };

        contactFields.forEach(function (field) {
            field.addEventListener("blur", function () {
                field.setAttribute("data-touched", "");
                markField(field);
            });
            field.addEventListener("input", function () {
                if (field.hasAttribute("data-touched")) {
                    markField(field);
                }
            });
        });

        contactForm.addEventListener("submit", function (event) {
            event.preventDefault();
            var firstBad = null;
            contactFields.forEach(function (field) {
                field.setAttribute("data-touched", "");
                markField(field);
                if (!firstBad && field.classList.contains("is-invalid")) {
                    firstBad = field;
                }
            });
            contactError.hidden = !firstBad;
            if (firstBad) {
                contactOk.hidden = true;
                firstBad.focus();
                return;
            }

            var val = function (name) {
                return contactForm.elements[name].value.trim();
            };
            var pref = contactForm.querySelector('input[name="pref"]:checked');
            var name = [val("first_name"), val("other_name"), val("surname")].filter(Boolean).join(" ");
            var body = "Name: " + name + "\nEmail: " + val("email") +
                (pref ? "\nPreferred contact: " + pref.value : "") +
                "\n\n" + val("message");
            var href = "mailto:publicaffairs@kenyashipyards.co.ke?subject=" +
                encodeURIComponent(val("subject")) + "&body=" + encodeURIComponent(body);

            var calm = document.documentElement.classList.contains("ksl-no-anim") ||
                window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            contactBtn.disabled = true;
            contactForm.classList.remove("is-sailing");
            void contactForm.offsetWidth;
            contactForm.classList.add("is-sailing");
            window.setTimeout(function () {
                window.location.href = href;
                contactOk.hidden = false;
            }, calm ? 0 : 1400);
            window.setTimeout(function () {
                contactBtn.disabled = false;
                contactForm.classList.remove("is-sailing");
            }, calm ? 600 : 2600);
        });
    }

    var slipMotion = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (slipMotion && "IntersectionObserver" in window) {
        var slipObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                entry.target.classList.add("is-open");
                slipObserver.unobserve(entry.target);
            });
        }, { threshold: 0.25 });
        var slipCount = new Map();
        document.querySelectorAll(".product-media, .ksl-project-photo").forEach(function (fig) {
            if (!fig.querySelector("img") || fig.closest(".modal")) return;
            if (getComputedStyle(fig).position === "static") fig.style.position = "relative";
            var group = fig.closest("[data-ksl-reveal]");
            var index = slipCount.get(group) || 0;
            slipCount.set(group, index + 1);
            var door = document.createElement("span");
            door.className = "ksl-slip-door";
            if (group) door.setAttribute("data-reveal", group.getAttribute("data-ksl-reveal"));
            door.style.transitionDelay = (120 + (index % 3) * 110) + "ms";
            door.setAttribute("aria-hidden", "true");
            door.addEventListener("transitionend", function () { door.remove(); }, { once: true });
            fig.appendChild(door);
            slipObserver.observe(door);
        });
    }

    (function kslServiceTabs() {
        "use strict";

        var list = document.querySelector(".ksl-svc-tabs");
        if (!list) {
            return;
        }
        var tabs = Array.prototype.slice.call(list.querySelectorAll('[role="tab"]'));

        tabs.forEach(function (tab) {
            var icon = tab.querySelector(".ksl-svc-tab-ico svg");
            if (icon) {
                var mark = icon.cloneNode(true);
                mark.setAttribute("class", "ksl-svc-tab-mark");
                tab.appendChild(mark);
            }
        });

        function select(tab, focus) {
            tabs.forEach(function (t) {
                var on = t === tab;
                t.setAttribute("aria-selected", on ? "true" : "false");
                t.tabIndex = on ? 0 : -1;
                var panel = document.getElementById(t.getAttribute("aria-controls"));
                if (panel) {
                    panel.hidden = !on;
                }
            });
            if (focus) {
                tab.focus();
            }
            window.dispatchEvent(new Event("scroll"));
        }

        tabs.forEach(function (tab, index) {
            tab.addEventListener("click", function () {
                select(tab);
                history.replaceState(null, "", "#" + tab.getAttribute("aria-controls"));
            });
            tab.addEventListener("keydown", function (event) {
                var next = null;
                if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                    next = tabs[(index + 1) % tabs.length];
                } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                    next = tabs[(index - 1 + tabs.length) % tabs.length];
                } else if (event.key === "Home") {
                    next = tabs[0];
                } else if (event.key === "End") {
                    next = tabs[tabs.length - 1];
                }
                if (next) {
                    event.preventDefault();
                    select(next, true);
                }
            });
        });

        var hash = location.hash.slice(1);
        var fromHash = /^[\w-]+$/.test(hash) && list.querySelector('[aria-controls="' + hash + '"]');
        if (fromHash) {
            select(fromHash);
        }
    })();

    document.querySelectorAll("[data-ksl-compare]").forEach(function (compare) {
        var range = compare.querySelector("input[type=range]");
        if (!range) return;
        var sync = function () { compare.style.setProperty("--pos", range.value + "%"); };
        range.addEventListener("input", sync);
        sync();
    });
})(jQuery);

