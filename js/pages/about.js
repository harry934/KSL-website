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

    initPath();
    initValues();
})();
