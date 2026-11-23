/* Scroll reveal, WOW bridge, overlay polish, and reduced-motion handling. */
(function (global) {
    "use strict";

    var OVERLAY_MS = 280;

    function motionOff() {
        return (
            global.matchMedia("(prefers-reduced-motion: reduce)").matches ||
            document.documentElement.classList.contains("ksl-no-anim")
        );
    }

    global.KSL_MOTION = {
        motionOff: motionOff,
        overlayMs: OVERLAY_MS,
    };

    function parseDelaySeconds(el, fallback) {
        var raw = el.getAttribute("data-wow-delay") || el.getAttribute("data-ksl-delay");
        if (!raw) {
            return fallback;
        }
        var n = parseFloat(raw);
        return Number.isFinite(n) ? n : fallback;
    }

    function upgradeWow() {
        document.querySelectorAll(".wow").forEach(function (el) {
            el.classList.add("ksl-reveal");
            var delay = parseDelaySeconds(el, 0);
            if (delay > 0) {
                el.style.setProperty("--ksl-reveal-delay", delay + "s");
            }
        });
    }

    function bindStaggerGroups() {
        document.querySelectorAll("[data-ksl-stagger]").forEach(function (group) {
            var step = parseFloat(group.getAttribute("data-ksl-stagger-step") || "0.085");
            if (!Number.isFinite(step)) {
                step = 0.085;
            }
            var items = group.matches("[data-ksl-stagger]")
                ? Array.prototype.slice.call(group.children)
                : Array.prototype.slice.call(group.querySelectorAll("[data-ksl-stagger-item]"));
            items.forEach(function (child, index) {
                if (!child.classList.contains("ksl-reveal")) {
                    child.classList.add("ksl-reveal");
                }
                var extra = parseDelaySeconds(child, index * step);
                child.style.setProperty("--ksl-reveal-delay", extra + "s");
            });
        });

        document.querySelectorAll(".ksl-services-grid, .ksl-feed-grid").forEach(function (grid) {
            var cards = grid.querySelectorAll(".service-item, .ksl-feed-card");
            cards.forEach(function (card, index) {
                if (card.closest("[data-ksl-reveal-on-click]")) {
                    return;
                }
                if (!card.classList.contains("ksl-reveal")) {
                    card.classList.add("ksl-reveal");
                }
                var base = parseDelaySeconds(card, index * 0.09);
                card.style.setProperty("--ksl-reveal-delay", base + "s");
            });
        });
    }

    function revealAllInstant() {
        document.querySelectorAll(".ksl-reveal").forEach(function (el) {
            el.classList.add("is-visible", "is-instant");
        });
    }

    function bindScrollReveal() {
        if (!("IntersectionObserver" in global)) {
            revealAllInstant();
            return;
        }

        var pendingReveal = [];
        var showReveal = function (el, instant) {
            if (instant) {
                el.classList.add("is-instant");
            }
            el.classList.add("is-visible");
            revealObserver.unobserve(el);
            var i = pendingReveal.indexOf(el);
            if (i > -1) {
                pendingReveal.splice(i, 1);
            }
        };

        var revealObserver = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        showReveal(entry.target, false);
                    } else if (entry.boundingClientRect.bottom < 0) {
                        showReveal(entry.target, true);
                    }
                });
            },
            { rootMargin: "0px 0px 10% 0px", threshold: 0 }
        );

        function observeReveal(el) {
            if (el.classList.contains("is-visible")) {
                return;
            }
            pendingReveal.push(el);
            revealObserver.observe(el);
        }

        document.querySelectorAll(".ksl-reveal").forEach(observeReveal);

        var sweepTicking = false;
        var sweepReveal = function () {
            sweepTicking = false;
            pendingReveal.slice().forEach(function (el) {
                var r = el.getBoundingClientRect();
                if (r.bottom < 0) {
                    showReveal(el, true);
                } else if (r.top < global.innerHeight) {
                    showReveal(el, false);
                }
            });
        };
        global.addEventListener(
            "scroll",
            function () {
                if (sweepTicking || !pendingReveal.length) {
                    return;
                }
                sweepTicking = true;
                global.requestAnimationFrame(sweepReveal);
            },
            { passive: true }
        );

        global.KSL_MOTION.observeReveal = function (root) {
            if (!root) {
                return;
            }
            root.querySelectorAll(".ksl-reveal").forEach(function (el) {
                if (!el.classList.contains("is-visible")) {
                    observeReveal(el);
                }
            });
        };
    }

    function bindMorph() {
        if (!("IntersectionObserver" in global)) {
            document.querySelectorAll(".ksl-morph").forEach(function (el) {
                el.classList.add("is-morphed");
            });
            return;
        }
        var morphObserver = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("is-morphed");
                        morphObserver.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.35 }
        );
        document.querySelectorAll(".ksl-morph").forEach(function (el) {
            morphObserver.observe(el);
        });
    }

    function bindBootstrapModals() {
        document.querySelectorAll(".modal").forEach(function (modal) {
            modal.addEventListener("show.bs.modal", function () {
                modal.classList.add("ksl-overlay-opening");
            });
            modal.addEventListener("shown.bs.modal", function () {
                modal.classList.remove("ksl-overlay-opening");
                modal.classList.add("ksl-overlay-open");
            });
            modal.addEventListener("hide.bs.modal", function () {
                modal.classList.remove("ksl-overlay-open");
                modal.classList.add("ksl-overlay-closing");
            });
            modal.addEventListener("hidden.bs.modal", function () {
                modal.classList.remove("ksl-overlay-closing");
            });
        });
    }

    upgradeWow();
    bindStaggerGroups();
    if (motionOff()) {
        revealAllInstant();
    } else {
        bindScrollReveal();
        bindMorph();
    }
    bindBootstrapModals();

    function wireFeedGrid(grid) {
        if (!grid) {
            return;
        }
        grid.classList.add("ksl-feed-grid");
        var cards = grid.querySelectorAll(".ksl-feed-card, .ksl-event-pack-card, .ksl-event-card");
        cards.forEach(function (card, index) {
            if (!card.classList.contains("ksl-reveal")) {
                card.classList.add("ksl-reveal");
            }
            card.style.setProperty("--ksl-reveal-delay", index * 0.08 + "s");
        });
        if (motionOff()) {
            cards.forEach(function (card) {
                card.classList.add("is-visible", "is-instant");
            });
            return;
        }
        if (global.KSL_MOTION.observeReveal) {
            global.KSL_MOTION.observeReveal(grid);
        }
    }

    global.KSL_MOTION.wireFeedGrid = wireFeedGrid;
})(window);