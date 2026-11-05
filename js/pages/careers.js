/* Jobs and internships. */
(function () {
    "use strict";

    var list = document.getElementById("ksl-careers-list");
    var empty = document.getElementById("ksl-careers-empty");
    if (!list) {
        return;
    }

    function placesOf(location) {
        return String(location || "")
            .split(/\s*(?:,|\/|\||\bor\b|\band\b|&)\s*/i)
            .map(function (s) { return s.trim(); })
            .filter(Boolean);
    }

    function calm() {
        return document.documentElement.classList.contains("ksl-no-anim") ||
            window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    function buildFilters(vacancies) {
        var places = [];
        vacancies.forEach(function (job) {
            placesOf(job.location).forEach(function (p) {
                if (places.indexOf(p) < 0) places.push(p);
            });
        });
        if (vacancies.length < 2 || places.length < 2) return;

        var bar = document.createElement("div");
        bar.className = "ksl-career-filters";
        bar.setAttribute("role", "group");
        bar.setAttribute("aria-label", "Filter roles by location");
        var pill = document.createElement("span");
        pill.className = "ksl-career-filter-pill";
        pill.setAttribute("aria-hidden", "true");
        bar.appendChild(pill);

        var status = document.createElement("p");
        status.className = "visually-hidden";
        status.setAttribute("aria-live", "polite");

        ["All"].concat(places).forEach(function (place, i) {
            var chip = document.createElement("button");
            chip.type = "button";
            chip.className = "ksl-career-filter";
            chip.textContent = place;
            chip.setAttribute("data-place", i ? place : "");
            chip.setAttribute("aria-pressed", i ? "false" : "true");
            bar.appendChild(chip);
        });

        list.parentNode.insertBefore(bar, list);
        list.parentNode.insertBefore(status, list);

        function movePill(chip) {
            pill.style.width = chip.offsetWidth + "px";
            pill.style.height = chip.offsetHeight + "px";
            pill.style.transform = "translate(" + chip.offsetLeft + "px," + chip.offsetTop + "px)";
        }

        function filter(place) {
            var cards = Array.prototype.slice.call(list.querySelectorAll(".ksl-career-card"));
            var first = new Map();
            cards.forEach(function (card) {
                if (!card.hidden) first.set(card, card.getBoundingClientRect());
            });
            var shown = 0;
            cards.forEach(function (card) {
                var match = !place || card.getAttribute("data-locations").split("|").indexOf(place) >= 0;
                card.hidden = !match;
                if (match) shown++;
            });
            status.textContent = shown + (shown === 1 ? " role" : " roles");
            if (calm() || !Element.prototype.animate) return;
            cards.forEach(function (card, i) {
                if (card.hidden) return;
                var before = first.get(card);
                if (!before) {
                    card.animate([
                        { opacity: 0, transform: "translateY(14px) scale(.98)" },
                        { opacity: 1, transform: "none" }
                    ], { duration: 380, delay: i * 40, easing: "cubic-bezier(.22,1,.36,1)", fill: "backwards" });
                    return;
                }
                var dy = before.top - card.getBoundingClientRect().top;
                if (!dy) return;
                card.animate([
                    { transform: "translateY(" + dy + "px)" },
                    { transform: "none" }
                ], { duration: 420, easing: "cubic-bezier(.22,1,.36,1)" });
            });
        }

        bar.addEventListener("click", function (event) {
            var chip = event.target.closest(".ksl-career-filter");
            if (!chip || chip.getAttribute("aria-pressed") === "true") return;
            bar.querySelectorAll(".ksl-career-filter").forEach(function (c) {
                c.setAttribute("aria-pressed", c === chip ? "true" : "false");
            });
            movePill(chip);
            filter(chip.getAttribute("data-place"));
        });

        requestAnimationFrame(function () {
            movePill(bar.querySelector(".ksl-career-filter"));
            bar.classList.add("is-ready");
        });
        window.addEventListener("resize", function () {
            movePill(bar.querySelector('.ksl-career-filter[aria-pressed="true"]'));
        });
    }

    function renderCareers(data) {
            var vacancies = data.vacancies || [];
            if (!vacancies.length && empty) {
                empty.hidden = false;
                empty.className = "ksl-empty-state";
                empty.setAttribute("role", "status");
                empty.innerHTML =
                    '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2"></rect><path d="M8 8h8M8 12h8M8 16h5"></path></svg>' +
                    "<h3>No open vacancies</h3>" +
                    "<p>There are no advertised roles at the moment. Send your CV for future opportunities.</p>" +
                    '<div class="ksl-empty-state-actions"><a class="btn btn-primary" href="mailto:careers@kenyashipyards.co.ke">Email careers</a><a class="btn btn-outline-primary" href="contact.html">Contact us</a></div>';
            }
            vacancies.forEach(function (job) {
                var esc = window.KSL_ESCAPE || function (value) { return String(value == null ? "" : value); };
                var link = window.KSL_SAFE_LINK || function () { return ""; };
                var apply = link(job.applyUrl) || link("mailto:" + (data.applyEmail || ""));
                var article = document.createElement("article");
                article.className = "ksl-career-card mb-4 p-4 bg-white shadow-sm";
                article.setAttribute("data-locations", placesOf(job.location).join("|"));
                article.innerHTML =
                    "<h3 class=\"h5\">" + esc(job.title) + "</h3>" +
                    "<p class=\"text-muted mb-2\">" + esc(job.location) + " · Closes " + esc(job.closingDate) + "</p>" +
                    "<p>" + esc(job.summary) + "</p>" +
                    (apply ? '<a class="btn btn-primary" href="' + esc(apply) + '">Apply</a>' : "");
                list.appendChild(article);
            });
            buildFilters(vacancies);
            var intern = document.getElementById("ksl-careers-internships");
            if (intern && data.internships && data.internships.length) {
                intern.innerHTML = data.internships.map(function (row) {
                    var esc = window.KSL_ESCAPE || function (value) { return String(value == null ? "" : value); };
                    return "<li><strong>" + esc(row.title) + "</strong> — " + esc(row.location) + ". " + esc(row.summary) + "</li>";
                }).join("");
            }
            var how = document.getElementById("ksl-careers-how");
            if (how) {
                how.textContent = data.applyNote;
            }
    }

    (window.KSL_CONTENT
        ? window.KSL_CONTENT.fetchJson("/api/public/careers", "data/careers.json")
        : fetch("data/careers.json").then(function (res) { return res.json(); }))
        .then(function (data) {
            if (!data) throw new Error("careers");
            renderCareers(data);
            if (window.KSL_LIVE) window.KSL_LIVE.show("[data-ksl-await='page']");
        })
        .catch(function () {
            if (empty) {
                empty.hidden = false;
                empty.className = "ksl-empty-state";
                empty.setAttribute("role", "status");
                empty.innerHTML =
                    '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2"></rect><path d="M8 8h8M8 12h8M8 16h5"></path></svg>' +
                    "<h3>Vacancies are unavailable</h3>" +
                    "<p>Check your connection, then try again.</p>" +
                    '<div class="ksl-empty-state-actions"><button class="btn btn-primary" type="button" onclick="window.location.reload()">Try again</button></div>';
            }
            if (window.KSL_LIVE) window.KSL_LIVE.show("[data-ksl-await='page']");
        });
})();
