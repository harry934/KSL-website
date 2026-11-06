/* About page: the story, the values and the path graphic. */
(function () {
    "use strict";

    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function initPath() {
        var section = document.querySelector(".ksl-path");
        var list = section && section.querySelector("[data-ksl-path]");
        if (!list) {
            return;
        }
        var items = Array.prototype.slice.call(list.children);
        initStory(items);
        if (reduceMotion || !("IntersectionObserver" in window)) {
            return;
        }
        section.classList.add("is-scroll");
        var track = initTrack(section, list, items);

        var reveal = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-in");
                    reveal.unobserve(entry.target);
                }
            });
        }, { threshold: 0.25 });
        items.forEach(function (item) { reveal.observe(item); });

        var ticking = false;
        function update() {
            ticking = false;
            var vh = window.innerHeight;
            var mid = vh / 2;
            var best = null;
            var bestDist = Infinity;
            items.forEach(function (item) {
                var rect = item.getBoundingClientRect();
                item.classList.toggle("is-reached", rect.top < vh * 0.6);
                var dist = Math.abs(rect.top + rect.height / 2 - mid);
                if (rect.bottom > 0 && rect.top < vh && dist < bestDist) {
                    bestDist = dist;
                    best = item;
                }
            });
            items.forEach(function (item) {
                item.classList.toggle("is-on", item === best);
            });
            if (track) {
                var box = list.getBoundingClientRect();
                track.set((vh * 0.6 - box.top) / box.height);
            }
        }
        function request() {
            if (!ticking) {
                ticking = true;
                window.requestAnimationFrame(update);
            }
        }
        window.addEventListener("scroll", request, { passive: true });
        window.addEventListener("resize", request);
        if (track) {
            track.onBuild = request;
        }
        update();
    }

    function initStory(items) {
        var linked = items.filter(function (item) {
            return item.hasAttribute("data-ksl-story");
        });
        linked.forEach(function (item) {
            var story = item.getAttribute("data-ksl-story");
            var peers = linked.filter(function (other) {
                return other !== item && other.getAttribute("data-ksl-story") === story;
            });
            item.addEventListener("mouseenter", function () {
                peers.forEach(function (peer) { peer.classList.add("is-linked"); });
            });
            item.addEventListener("mouseleave", function () {
                peers.forEach(function (peer) { peer.classList.remove("is-linked"); });
            });
        });
    }

    function initTrack(section, list, items) {
        var ns = "http://www.w3.org/2000/svg";
        var svg = document.createElementNS(ns, "svg");
        var line = document.createElementNS(ns, "path");
        var ship = document.createElementNS(ns, "g");
        var dot = document.createElementNS(ns, "circle");
        var ping = document.createElementNS(ns, "circle");
        var start = document.createElementNS(ns, "circle");
        if (!line.getTotalLength) {
            return null;
        }
        start.setAttribute("class", "ksl-path-start");
        start.setAttribute("r", "6.5");
        svg.setAttribute("class", "ksl-path-track");
        svg.setAttribute("aria-hidden", "true");
        ship.setAttribute("class", "ksl-path-ship");
        dot.setAttribute("r", "8");
        ping.setAttribute("r", "8");
        ship.appendChild(dot);
        ship.appendChild(ping);
        svg.appendChild(line);
        svg.appendChild(start);
        svg.appendChild(ship);
        list.parentNode.insertBefore(svg, list.nextSibling);

        var api = { total: 0, progress: 0, target: 0, onBuild: null };
        var frame = 0;
        var last = items[items.length - 1];

        function build() {
            var radius = parseFloat(getComputedStyle(list).getPropertyValue("--ksl-path-r")) || 76;
            var c = 1.5;
            var r = radius - c;
            var d = "";
            items.forEach(function (item, i) {
                var x = item.offsetLeft;
                var w = item.offsetWidth;
                var top = item.offsetTop + c;
                var bottom = item.offsetTop + item.offsetHeight - c;
                if (i % 2 === 0) {
                    var right = x + w - c;
                    d += (i === 0 ? "M" + x + " " + top : "") +
                        "H" + (right - r) +
                        "A" + r + " " + r + " 0 0 1 " + right + " " + (top + r) +
                        "V" + (bottom - r) +
                        "A" + r + " " + r + " 0 0 1 " + (right - r) + " " + bottom +
                        "H" + x;
                } else {
                    var left = x + c;
                    d += "H" + (left + r) +
                        "A" + r + " " + r + " 0 0 0 " + left + " " + (top + r) +
                        "V" + (bottom - r) +
                        "A" + r + " " + r + " 0 0 0 " + (left + r) + " " + bottom +
                        "H" + (x + w);
                }
            });
            svg.setAttribute("width", section.offsetWidth);
            svg.setAttribute("height", section.offsetHeight);
            line.setAttribute("d", d);
            api.total = line.getTotalLength();
            var origin = line.getPointAtLength(0);
            start.setAttribute("cx", origin.x);
            start.setAttribute("cy", origin.y);
            line.style.strokeDasharray = api.total + " " + api.total;
            section.classList.add("is-tracked");
            draw();
            if (api.onBuild) {
                api.onBuild();
            }
        }

        function draw() {
            var length = api.total * api.progress;
            var point = line.getPointAtLength(length);
            line.style.strokeDashoffset = api.total - length;
            ship.setAttribute("transform", "translate(" + point.x + " " + point.y + ")");
            last.classList.toggle("is-done", api.progress >= 1);
            ship.classList.toggle("is-done", api.progress >= 1);
        }

        var lastTime = 0;

        function ease(now) {
            var dt = lastTime ? Math.min(now - lastTime, 250) : 16;
            var gap = api.target - api.progress;
            lastTime = now;
            if (Math.abs(gap) < 0.0005) {
                api.progress = api.target;
                frame = 0;
                lastTime = 0;
            } else {
                api.progress += gap * (1 - Math.exp(-dt / 130));
                frame = window.requestAnimationFrame(ease);
            }
            draw();
        }

        api.set = function (value) {
            api.target = Math.min(1, Math.max(0, value));
            if (api.total && !frame) {
                frame = window.requestAnimationFrame(ease);
            }
        };

        build();
        if ("ResizeObserver" in window) {
            new ResizeObserver(build).observe(list);
        } else {
            window.addEventListener("resize", build);
        }
        return api;
    }

    function initValues() {
        var root = document.querySelector(".ksl-values-stack");
        if (!root) {
            return;
        }
        var rows = Array.prototype.slice.call(root.querySelectorAll(".ksl-values-list li"));

        function select(index) {
            rows.forEach(function (row) {
                row.classList.toggle("is-on", Number(row.getAttribute("data-value")) === index);
            });
        }

        rows.forEach(function (row) {
            var index = Number(row.getAttribute("data-value"));
            row.addEventListener("mouseenter", function () { select(index); });
            row.addEventListener("click", function () { select(index); });
            row.addEventListener("focus", function () { select(index); });
            row.addEventListener("keydown", function (event) {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    select(index);
                }
            });
        });

        select(0);
    }

    initValues();
    loadMilestones(initPath);

    function loadMilestones(done) {
        var section = document.querySelector(".ksl-path");
        if (!section) {
            done();
            return;
        }
        function finish(data) {
            paintMilestones(section, data);
            section.classList.remove("is-holding");
            if (window.KSL_LIVE) window.KSL_LIVE.show(section);
            if (!section.hidden) {
                window.requestAnimationFrame(function () { done(); });
            }
        }
        var pending = window.KSL_ORG_PROMISE;
        if (pending && typeof pending.then === "function") {
            pending.then(finish, function () { finish(null); });
            return;
        }
        var request = window.KSL_CONTENT
            ? window.KSL_CONTENT.fetchJson("/api/public/organization", "data/organization.json")
            : fetch("data/organization.json").then(function (res) { return res.ok ? res.json() : null; }).catch(function () { return null; });
        Promise.resolve(request).then(finish, function () { finish(null); });
    }

    function paintMilestones(section, data) {
        if (!data || !Array.isArray(data.milestones)) return;
        var list = section.querySelector("[data-ksl-path]");
        if (!list) return;
        if (!data.milestones.length) {
            section.hidden = true;
            return;
        }
        section.hidden = false;
        var esc = window.KSL_ESCAPE || function (value) { return String(value == null ? "" : value); };
        var heading = section.querySelector("h2");
        var lead = section.querySelector(".ksl-learn-lead");
        if (heading && data.milestonesTitle) heading.textContent = data.milestonesTitle;
        if (lead && data.milestonesLead) lead.textContent = data.milestonesLead;
        var html = data.milestones.map(milestoneHtml).filter(Boolean);
        if (!html.length) {
            section.hidden = true;
            return;
        }
        list.innerHTML = html.join("");

        function milestoneHtml(item) {
            var when = dateParts(item && item.date);
            var title = item && item.title ? String(item.title) : "";
            var summary = item && item.summary ? String(item.summary) : "";
            var image = safeImage(item && item.image);
            if (!when && !title && !summary && !image) return "";
            var story = safeKey(item.story);
            var slot = image && image.indexOf("img/") === 0 ? safeSlot(item.imageSlot) : "";
            var alt = item.alt ? String(item.alt) : title;
            var tag = item.tag ? String(item.tag).trim() : "";
            var note = item.note ? String(item.note).trim() : "";
            var html = "<li" + (story ? ' data-ksl-story="' + story + '"' : "") + ">";
            if (image) html += '<img' + (slot ? ' data-ksl-image="' + slot + '"' : "") + ' src="' + esc(image) + '" alt="' + esc(alt) + '">';
            html += "<div>";
            if (when) html += "<time datetime=\"" + when.iso + "\"><b>" + esc(when.year) + "</b>" + esc(when.rest) + "</time>";
            if (title) html += "<h3>" + esc(title) + "</h3>";
            if (summary) html += "<p>" + esc(summary) + "</p>";
            if (tag) {
                html += '<span class="ksl-path-tag"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76"/><path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6"/><path d="M12 10v4"/><path d="M12 2v3"/></svg>' + esc(tag);
                if (note) html += "<em>" + esc(note) + "</em>";
                html += "</span>";
            }
            html += "</div></li>";
            return html;
        }
    }

    function dateParts(value) {
        var text = String(value || "");
        var yearOnly = /^(\d{4})$/.exec(text);
        if (yearOnly) return { iso: yearOnly[1], year: yearOnly[1], rest: "" };
        var yearMonth = /^(\d{4})-(\d{2})$/.exec(text);
        if (yearMonth) {
            var monthDate = new Date(Date.UTC(Number(yearMonth[1]), Number(yearMonth[2]) - 1, 1));
            if (monthDate.getUTCMonth() !== Number(yearMonth[2]) - 1) return null;
            return {
                iso: yearMonth[0],
                year: yearMonth[1],
                rest: monthDate.toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" })
            };
        }
        var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
        if (!match) return null;
        var year = Number(match[1]);
        var month = Number(match[2]);
        var day = Number(match[3]);
        var date = new Date(Date.UTC(year, month - 1, day));
        if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
        return {
            iso: match[0],
            year: match[1],
            rest: date.toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" })
        };
    }

    function safeImage(value) {
        var text = String(value || "").trim();
        if (/^img\/[A-Za-z0-9_./-]+\.(jpe?g|png|webp)$/.test(text)) return text;
        if (/^https:\/\/[^\s"'<>]+$/.test(text) && /\.(jpe?g|png|webp)(\?|#|$)/i.test(text)) return text;
        return "";
    }

    function safeSlot(value) {
        var text = String(value || "");
        return /^about\.\d{1,3}-[a-z0-9-]{1,80}$/.test(text) ? text : "";
    }

    function safeKey(value) {
        var text = String(value || "");
        return /^[a-z0-9-]{1,40}$/.test(text) ? text : "";
    }
})();
