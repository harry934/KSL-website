/* Board of directors. */
(function () {
    "use strict";

    var cards = document.querySelectorAll(".board-card");
    if (!cards.length) return;

    var filters = document.querySelectorAll(".board-filter");
    var committees = document.querySelectorAll(".board-committee");
    var featured = document.querySelector(".board-featured");
    var empty = document.getElementById("boardEmpty");
    var lastCard = null;

    var modal = document.createElement("div");
    modal.className = "board-modal";
    modal.id = "kslBoardModal";
    modal.hidden = true;
    modal.innerHTML =
        '<div class="board-modal-backdrop" data-board-close></div>' +
        '<div class="board-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="kslBoardModalTitle">' +
        '<button type="button" class="board-modal-close" data-board-close aria-label="Close">&times;</button>' +
        '<div class="board-modal-photo"><img alt=""></div>' +
        '<p class="board-role" id="kslBoardModalRole"></p>' +
        '<h2 id="kslBoardModalTitle"></h2>' +
        '<p class="board-modal-meta" id="kslBoardModalArea"></p>' +
        '<div class="board-modal-copy" id="kslBoardModalBio"></div>' +
        "</div>";
    (document.getElementById("ksl-page") || document.body).appendChild(modal);

    function areaLabel(card) {
        var section = card.closest(".board-committee");
        if (section) {
            var heading = section.querySelector("h2");
            return heading ? heading.textContent : "";
        }
        if (card.classList.contains("board-card-featured")) return "Leadership";
        return "";
    }

    function openCard(card) {
        var img = card.querySelector("img");
        var role = card.querySelector(".board-role");
        var name = card.querySelector("h3");
        var bio = card.querySelector(".board-card-body > p:last-of-type");
        lastCard = card;
        modal.querySelector(".board-modal-photo img").src = img ? img.getAttribute("src") : "";
        modal.querySelector(".board-modal-photo img").alt = img ? img.alt : "";
        modal.querySelector("#kslBoardModalRole").textContent = role ? role.textContent : "";
        modal.querySelector("#kslBoardModalTitle").textContent = name ? name.textContent : "";
        modal.querySelector("#kslBoardModalArea").textContent = areaLabel(card);
        var bioEl = modal.querySelector("#kslBoardModalBio");
        bioEl.replaceChildren();
        var full = card.querySelector("template.board-bio");
        if (full && full.content) {
            bioEl.appendChild(full.content.cloneNode(true));
        } else if (bio) {
            var paragraph = document.createElement("p");
            paragraph.textContent = bio.textContent;
            bioEl.appendChild(paragraph);
        }
        modal.hidden = false;
        document.documentElement.style.overflow = "hidden";
        var closeBtn = modal.querySelector(".board-modal-close");
        if (closeBtn) closeBtn.focus();
    }

    function closeCard() {
        if (modal.hidden) return;
        modal.hidden = true;
        document.documentElement.style.overflow = "";
        if (lastCard && lastCard.focus) lastCard.focus();
    }

    function applyFilter(name) {
        document.querySelectorAll(".board-card").forEach(function (card) {
            var slot = card.closest(".board-slot");
            var show = name === "all" || card.getAttribute("data-board-group") === name;
            if (slot) slot.hidden = !show;
        });
        committees.forEach(function (section) {
            section.hidden = !section.querySelector(".board-slot:not([hidden])");
        });
        if (featured) {
            featured.hidden = !featured.querySelector(".board-slot:not([hidden])");
        }
        if (empty) {
            var any = document.querySelector(".board-slot:not([hidden])");
            empty.hidden = !!any;
        }
    }

    filters.forEach(function (button) {
        button.addEventListener("click", function () {
            filters.forEach(function (item) {
                item.setAttribute("aria-pressed", item === button ? "true" : "false");
            });
            applyFilter(button.getAttribute("data-filter") || "all");
        });
    });

    function wireCard(card) {
        var body = card.querySelector(".board-card-body");
        if (body && !body.querySelector(".ksl-more")) {
            var more = document.createElement("span");
            more.className = "ksl-more";
            more.innerHTML = '<span>Read more</span><i aria-hidden="true"><svg viewBox="0 0 16 16"><circle cx="8" cy="2.8" r="1.6"/><path d="M8 4.4V14.2M5 6.6h6M2.6 10.6Q3.6 14.2 8 14.2T13.4 10.6M1.8 11.8l.8-1.2 1.4.9M14.2 11.8l-.8-1.2-1.4.9"/></svg></i>';
            body.appendChild(more);
        }
        if (card.getAttribute("data-ksl-wired")) return;
        card.setAttribute("data-ksl-wired", "1");
        card.addEventListener("click", function () { openCard(card); });
        card.addEventListener("keydown", function (event) {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openCard(card);
            }
        });
    }

    cards.forEach(wireCard);

    modal.addEventListener("click", function (event) {
        if (event.target.closest("[data-board-close]")) closeCard();
    });
    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") closeCard();
    });

    document.documentElement.classList.add("board-motion");
    var svgNs = "http://www.w3.org/2000/svg";
    cards.forEach(function (card) {
        var portrait = card.querySelector(".board-portrait");
        if (!portrait || portrait.querySelector(".board-ring")) return;
        var img = portrait.querySelector("img");
        if (img && !portrait.querySelector(".board-photo")) {
            var clip = document.createElement("span");
            clip.className = "board-photo";
            portrait.insertBefore(clip, img);
            clip.appendChild(img);
        }
        var ring = document.createElementNS(svgNs, "svg");
        ring.setAttribute("class", "board-ring");
        ring.setAttribute("viewBox", "0 0 100 100");
        ring.setAttribute("aria-hidden", "true");
        var circle = document.createElementNS(svgNs, "circle");
        circle.setAttribute("cx", "50");
        circle.setAttribute("cy", "50");
        circle.setAttribute("r", "46");
        ring.appendChild(circle);
        portrait.appendChild(ring);
    });

    function revealRow(row) {
        if (!row || row.closest("[hidden]")) return;
        var step = 0;
        row.querySelectorAll(".board-card").forEach(function (card) {
            var slot = card.closest(".board-slot");
            if (slot && slot.hidden) return;
            if (card.classList.contains("is-in")) return;
            card.style.setProperty("--board-i", String(step));
            step += 1;
            card.classList.add("is-in");
        });
    }

    function revealInView() {
        document.querySelectorAll(".board-featured, .board-grid").forEach(function (row) {
            var rect = row.getBoundingClientRect();
            if (rect.width === 0 || rect.bottom < 40 || rect.top > window.innerHeight - 40) return;
            revealRow(row);
        });
    }

    var motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionQuery.matches) {
        cards.forEach(function (card) { card.classList.add("is-in"); });
    } else if ("IntersectionObserver" in window) {
        var revealObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) revealRow(entry.target);
            });
        }, { threshold: 0.22, rootMargin: "0px 0px -6% 0px" });
        document.querySelectorAll(".board-featured, .board-grid").forEach(function (row) {
            revealObserver.observe(row);
        });
        window.requestAnimationFrame(function () {
            window.requestAnimationFrame(revealInView);
        });
    } else {
        cards.forEach(function (card) { card.classList.add("is-in"); });
    }

    function equalizeSections() {
        document.querySelectorAll(".board-featured, .board-grid").forEach(function (group) {
            var visible = [];
            group.querySelectorAll(".board-card").forEach(function (card) {
                var slot = card.closest(".board-slot");
                if (slot && slot.hidden) return;
                card.style.minHeight = "";
                visible.push(card);
            });
            var tallest = 0;
            visible.forEach(function (card) {
                if (card.offsetHeight > tallest) tallest = card.offsetHeight;
            });
            if (!tallest) return;
            visible.forEach(function (card) {
                card.style.minHeight = tallest + "px";
            });
        });
    }

    var equalizeFrame = 0;
    function queueEqualize() {
        if (equalizeFrame) return;
        equalizeFrame = window.requestAnimationFrame(function () {
            equalizeFrame = 0;
            equalizeSections();
        });
    }

    queueEqualize();
    window.addEventListener("resize", queueEqualize);
    window.addEventListener("load", queueEqualize);
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(queueEqualize);
    }

    var filterApply = applyFilter;
    applyFilter = function (name) {
        filterApply(name);
        window.requestAnimationFrame(revealInView);
        queueEqualize();
    };

    function escapeHtml(value) {
        return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }

    function portraitSrc(member) {
        if (member.photo) return member.photo;
        var parts = String(member.name || "").trim().split(/\s+/).filter(Boolean);
        var initials = ((parts[0] || "K").charAt(0) + (parts.length > 1 ? parts[parts.length - 1].charAt(0) : "")).toUpperCase();
        var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="480"><rect width="100%" height="100%" fill="#0b1f3a"/><text x="50%" y="54%" text-anchor="middle" fill="#c5a028" font-family="Georgia,serif" font-size="120">' + initials + "</text></svg>";
        return "data:image/svg+xml," + encodeURIComponent(svg);
    }

    function bioHtml(text) {
        return String(text || "").split(/\n\s*\n/).map(function (block) {
            var lines = block.split("\n").map(function (line) { return line.trim(); }).filter(Boolean);
            if (!lines.length) return "";
            if (lines.every(function (line) { return line.indexOf("- ") === 0; })) {
                return "<ul>" + lines.map(function (line) { return "<li>" + escapeHtml(line.slice(2)) + "</li>"; }).join("") + "</ul>";
            }
            return "<p>" + escapeHtml(lines.join(" ")) + "</p>";
        }).join("");
    }

    function memberCard(member, featured) {
        var group = member.group === "defence" || member.group === "ps" ? member.group : "independent";
        var bio = bioHtml(member.bio);
        return '<article class="board-card' + (featured ? " board-card-featured" : "") + '" tabindex="0" data-board-group="' + escapeHtml(group) + '">' +
            '<div class="board-portrait"><img src="' + escapeHtml(portraitSrc(member)) + '" alt="' + escapeHtml(member.name) + '" loading="lazy" decoding="async"></div>' +
            '<div class="board-card-body"><p class="board-role">' + escapeHtml(member.role) + "</p><h3>" + escapeHtml(member.name) + "</h3><p>" + escapeHtml(member.summary) + "</p>" +
            (bio ? '<template class="board-bio">' + bio + "</template>" : "") +
            "</div></article>";
    }

    function paintBoard(members) {
        var root = document.getElementById("ksl-board-root");
        if (!root || !members.length || !members.some(function (member) { return member.section; })) return false;
        var sections = [
            { key: "featured", featured: true },
            { key: "audit", title: "Audit", blurb: "Finance, controls, and public accountability." },
            { key: "risk", title: "Risk", blurb: "Operational readiness and security." },
            { key: "strategy", title: "Strategy", blurb: "Industrial growth and long term direction." }
        ];
        root.innerHTML = sections.map(function (section) {
            var people = members.filter(function (member) { return (member.section || "audit") === section.key; });
            if (!people.length) return "";
            if (section.featured) {
                return '<section class="board-featured" aria-label="Board leadership">' +
                    people.map(function (member) { return '<div class="board-slot">' + memberCard(member, true) + "</div>"; }).join("") +
                    "</section>";
            }
            return '<section class="board-committee" aria-labelledby="board-' + section.key + '">' +
                '<h2 id="board-' + section.key + '">' + escapeHtml(section.title) + "</h2><p>" + escapeHtml(section.blurb) + "</p>" +
                '<div class="row g-4 board-grid justify-content-center">' +
                people.map(function (member) {
                    return '<div class="col-xl-3 col-md-4 col-6 board-slot">' + memberCard(member, false) + "</div>";
                }).join("") +
                "</div></section>";
        }).join("");
        root.querySelectorAll(".board-card").forEach(function (card) {
            wireCard(card);
            var portrait = card.querySelector(".board-portrait");
            if (portrait && !portrait.querySelector(".board-ring")) {
                var img = portrait.querySelector("img");
                if (img && !portrait.querySelector(".board-photo")) {
                    var clip = document.createElement("span");
                    clip.className = "board-photo";
                    portrait.insertBefore(clip, img);
                    clip.appendChild(img);
                }
                var ring = document.createElementNS(svgNs, "svg");
                ring.setAttribute("class", "board-ring");
                ring.setAttribute("viewBox", "0 0 100 100");
                ring.setAttribute("aria-hidden", "true");
                var circle = document.createElementNS(svgNs, "circle");
                circle.setAttribute("cx", "50");
                circle.setAttribute("cy", "50");
                circle.setAttribute("r", "46");
                ring.appendChild(circle);
                portrait.appendChild(ring);
            }
            if (motionQuery.matches) card.classList.add("is-in");
        });
        if (!motionQuery.matches && revealObserver) {
            root.querySelectorAll(".board-featured, .board-grid").forEach(function (row) {
                revealObserver.observe(row);
            });
        }
        var pressed = document.querySelector(".board-filter[aria-pressed='true']");
        applyFilter(pressed ? pressed.getAttribute("data-filter") || "all" : "all");
        queueEqualize();
        return true;
    }

    if (window.KSL_CONTENT) {
        window.KSL_CONTENT.fetchJson("/api/public/organization", "data/organization.json").then(function (data) {
            paintBoard((data && data.board) || []);
        }).catch(function () {});
    }
})();
