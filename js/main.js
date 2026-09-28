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


    // Sticky Navbar
    $(window).scroll(function () {
        if ($(this).scrollTop() > 300) {
            $('.sticky-top').addClass('shadow-sm').css('top', '0px');
        } else {
            $('.sticky-top').removeClass('shadow-sm').css('top', '-100px');
        }
    });
    
    
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
            return root.classList.contains("ksl-intro-active") ||
                root.classList.contains("ksl-intro-pending") ||
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
    if (searchQuery && document.getElementById("newsList")) {
        var needle = searchQuery.trim().toLowerCase();
        var cards = document.querySelectorAll("#newsList .news-hit");
        var shown = 0;
        cards.forEach(function (card) {
            var hit = card.textContent.toLowerCase().indexOf(needle) !== -1;
            card.style.display = hit ? "" : "none";
            if (hit) shown += 1;
        });
        var note = document.getElementById("searchNote");
        if (note) {
            note.textContent = shown ? "Results for “" + searchQuery.trim() + "”" : "No results for “" + searchQuery.trim() + "”";
        }
    }

    var currentPage = window.location.pathname.split("/").pop() || "index.html";
    var currentHash = window.location.hash || "";
    document.querySelectorAll(".dropdown-item").forEach(function (link) {
        var href = link.getAttribute("href") || "";
        var parts = href.split("#");
        var targetPage = parts[0];
        var targetHash = parts[1] ? "#" + parts[1] : "";
        var isActive = false;
        if (targetPage === currentPage) {
            if (targetHash) {
                isActive = targetHash === currentHash;
            } else {
                isActive = true;
            }
        }
        if (isActive) {
            link.classList.add("active");
            link.setAttribute("aria-current", "page");
        }
    });
    document.querySelectorAll(".nav-item.dropdown").forEach(function (item) {
        var toggle = item.querySelector(".nav-link.dropdown-toggle");
        if (!toggle) return;
        if (item.querySelector(".dropdown-item.active")) {
            toggle.classList.add("active");
        }
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
            var latchPhotoReveal = function () {
                card.classList.add("is-held");
            };
            readMore.addEventListener("mouseenter", latchPhotoReveal);
            readMore.addEventListener("focus", latchPhotoReveal);
            readMore.addEventListener("click", latchPhotoReveal);
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
        window.requestAnimationFrame(function () {
            heroReveal.classList.add("is-revealed");
        });
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
                galleryRoot.innerHTML = '<p class="ksl-gallery-empty mb-0">No photos in this category yet. Try another filter or view <a href="videos.html#photos">all photos</a>.</p>';
            }
        };

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
                galleryRoot.innerHTML = '<p class="ksl-gallery-loading mb-0">Could not load gallery. Please try again later.</p>';
            });
    }

    if (window.bootstrap && window.bootstrap.Dropdown) {
        document.querySelectorAll(".top-more .dropdown-toggle").forEach(function (toggle) {
            toggle.addEventListener("click", function (event) {
                event.preventDefault();
            });
            window.bootstrap.Dropdown.getOrCreateInstance(toggle);
        });
    }

    (function initKslMobileNav() {
        var mq = window.matchMedia("(max-width: 991.98px)");

        function currentPage() {
            var path = window.location.pathname || "";
            var file = path.split("/").pop();
            return file || "index.html";
        }

        function build() {
            if (!mq.matches) {
                return;
            }
            if (document.querySelector(".ksl-bottom-nav")) {
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

            var tabs = [
                { href: "index.html", label: "Home", match: ["index.html", ""], icon: iconHome },
                { href: "service.html", label: "Services", match: ["service.html"], icon: iconService },
                { href: "about.html", label: "About", match: ["about.html", "board.html", "organization.html"], icon: iconAbout },
                { href: "videos.html", label: "Gallery", match: ["videos.html"], icon: iconGallery }
            ];

            tabs.forEach(function (tab) {
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

        build();
        if (mq.addEventListener) {
            mq.addEventListener("change", build);
        } else if (mq.addListener) {
            mq.addListener(build);
        }
    })();

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

