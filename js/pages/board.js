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
        '<h3>Qualifications</h3>' +
        '<p id="kslBoardModalBio"></p>' +
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
        var bio = card.querySelector(".board-card-body > p:last-child");
        lastCard = card;
        modal.querySelector(".board-modal-photo img").src = img ? img.getAttribute("src") : "";
        modal.querySelector(".board-modal-photo img").alt = img ? img.alt : "";
        modal.querySelector("#kslBoardModalRole").textContent = role ? role.textContent : "";
        modal.querySelector("#kslBoardModalTitle").textContent = name ? name.textContent : "";
        modal.querySelector("#kslBoardModalArea").textContent = areaLabel(card);
        modal.querySelector("#kslBoardModalBio").textContent = bio ? bio.textContent : "";
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
        cards.forEach(function (card) {
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

    cards.forEach(function (card) {
        card.addEventListener("click", function () { openCard(card); });
        card.addEventListener("keydown", function (event) {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openCard(card);
            }
        });
    });

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

    var filterApply = applyFilter;
    applyFilter = function (name) {
        filterApply(name);
        window.requestAnimationFrame(revealInView);
    };
})();
