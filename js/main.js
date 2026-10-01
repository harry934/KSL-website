(function ($) {
    "use strict";

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


    $(".sticky-top").css("top", "0px");
    
    
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
    if (aboutMainImage && !reduceMotion.matches) {
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
            heroVideo.style.transform = "translate3d(0, " + shift.toFixed(2) + "px, 0)";
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
    }

    var parallaxTargets = document.querySelectorAll("[data-ksl-parallax]");
    if (parallaxTargets.length && !reduceMotion.matches) {
        var defaultParallaxMax = 120;
        var pageTop = function (el) {
            var top = 0;
            var node = el;
            while (node) {
                top += node.offsetTop || 0;
                node = node.offsetParent;
            }
            return top;
        };
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
        var updateParallax = function () {
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
            parallaxTicking = false;
        };
        var requestParallax = function () {
            if (!parallaxTicking) {
                window.requestAnimationFrame(updateParallax);
                parallaxTicking = true;
            }
        };
        window.addEventListener("scroll", requestParallax, { passive: true });
        window.addEventListener("resize", requestParallax);
        updateParallax();
    }

    var factsBg = document.querySelector(".facts-bg");
    if (factsBg && !reduceMotion.matches) {
        var factsSection = factsBg.parentElement;
        var factsTicking = false;
        var updateFacts = function () {
            var rect = factsSection.getBoundingClientRect();
            var viewport = window.innerHeight || document.documentElement.clientHeight;
            if (rect.bottom < 0 || rect.top > viewport) {
                factsTicking = false;
                return;
            }
            var progress = (viewport - rect.top) / (viewport + rect.height);
            var shift = (0.5 - progress) * 40;
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
    if (pageHeaders.length) {
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
        var grid = document.querySelector(".ksl-services-grid");
        if (!grid) {
            return;
        }
        var cards = Array.prototype.slice.call(grid.querySelectorAll(".service-item"));
        if (!cards.length) {
            return;
        }
        var timers = [];
        var pause = 900;
        var step = 380;

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

        var playing = false;
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
                    var a = document.createElement("a");
                    a.href = file.href;
                    a.target = "_blank";
                    a.rel = "noopener";
                    a.textContent = file.title;
                    li.appendChild(a);
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

    
})(jQuery);

