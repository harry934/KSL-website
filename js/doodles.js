/* Holiday crest for the navbar, in the spirit of a Google doodle.
   Dates follow the Public Holidays Act (Cap. 110): Part I for everyone,
   Idd-ul-Azha (Part II), and Diwali (Part III). Islamic days follow the
   Kenya Gazette when we have it, otherwise a tabular calendar. A Part I
   holiday that falls on Sunday is also marked on the following Monday. */
(function (root, factory) {
    var api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    if (typeof document !== "undefined") api.mount();
    root.kslDoodles = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
    "use strict";

    var SCENES = {
        newyear: "New Year's Day",
        goodfriday: "Good Friday",
        easter: "Easter Monday",
        labour: "Labour Day",
        madaraka: "Madaraka Day",
        fitr: "Idd-ul-Fitr",
        adha: "Idd-ul-Azha",
        mazingira: "Mazingira Day",
        mashujaa: "Mashujaa Day",
        jamhuri: "Jamhuri Day",
        christmas: "Christmas Day",
        boxing: "Boxing Day",
        diwali: "Diwali",
        election: "Election Day"
    };

    /* Gazette and well-attested dates. Computed dates fill the other years. */
    var ISLAMIC = {
        2026: { fitr: [3, 20], adha: [5, 27] },
        2027: { fitr: [3, 10], adha: [5, 17] },
        2028: { fitr: [2, 26], adha: [5, 5] }
    };

    var DIWALI = {
        2024: [11, 1],
        2025: [10, 20],
        2026: [11, 8],
        2027: [10, 29],
        2028: [10, 17]
    };

    var SPECIAL = {
        "2027-08-10": "election"
    };

    function pad(n) { return (n < 10 ? "0" : "") + n; }
    function key(y, m, d) { return y + "-" + pad(m) + "-" + pad(d); }

    function nairobiParts(date) {
        var fmt = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Africa/Nairobi",
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        });
        var y, m, d;
        fmt.formatToParts(date).forEach(function (part) {
            if (part.type === "year") y = +part.value;
            if (part.type === "month") m = +part.value;
            if (part.type === "day") d = +part.value;
        });
        return { y: y, m: m, d: d };
    }

    function weekday(y, m, d) {
        return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    }

    function addDays(y, m, d, n) {
        var dt = new Date(Date.UTC(y, m - 1, d + n));
        return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
    }

    function easterSunday(year) {
        var a = year % 19;
        var b = Math.floor(year / 100);
        var c = year % 100;
        var d = Math.floor(b / 4);
        var e = b % 4;
        var f = Math.floor((b + 8) / 25);
        var g = Math.floor((b - f + 1) / 3);
        var h = (19 * a + b - d - g + 15) % 30;
        var i = Math.floor(c / 4);
        var k = c % 4;
        var l = (32 + 2 * e + 2 * i - h - k) % 7;
        var m = Math.floor((a + 11 * h + 22 * l) / 451);
        var month = Math.floor((h + l - 7 * m + 114) / 31);
        var day = ((h + l - 7 * m + 114) % 31) + 1;
        return { m: month, d: day };
    }

    function hijriToGregorian(hy, hm, hd) {
        var jd = Math.floor((11 * hy + 3) / 30) + 354 * hy + 30 * hm - Math.floor((hm - 1) / 2) + hd + 1948440 - 385;
        var l = jd + 68569;
        var n = Math.floor((4 * l) / 146097);
        l = l - Math.floor((146097 * n + 3) / 4);
        var i = Math.floor((4000 * (l + 1)) / 1461001);
        l = l - Math.floor((1461 * i) / 4) + 31;
        var j = Math.floor((80 * l) / 2447);
        var day = l - Math.floor((2447 * j) / 80);
        l = Math.floor(j / 11);
        var month = j + 2 - 12 * l;
        var year = 100 * (n - 49) + i + l;
        return { y: year, m: month, d: day };
    }

    function gregorianToHijriYear(year) {
        return Math.round((year - 622) * 33 / 32);
    }

    function islamicOn(year, hm, hd) {
        var guess = gregorianToHijriYear(year);
        var found = null;
        for (var hy = guess - 1; hy <= guess + 1; hy++) {
            var g = hijriToGregorian(hy, hm, hd);
            if (g.y === year) found = g;
        }
        return found;
    }

    function put(map, y, m, d, id) {
        if (!y || !m || !d || !SCENES[id]) return;
        map[key(y, m, d)] = id;
    }

    function calendar(year) {
        var map = {};
        var diwali = DIWALI[year];
        if (diwali) put(map, year, diwali[0], diwali[1], "diwali");

        var islamic = ISLAMIC[year];
        if (islamic) {
            put(map, year, islamic.fitr[0], islamic.fitr[1], "fitr");
            put(map, year, islamic.adha[0], islamic.adha[1], "adha");
        } else {
            var fitr = islamicOn(year, 10, 1);
            var adha = islamicOn(year, 12, 10);
            if (fitr) put(map, fitr.y, fitr.m, fitr.d, "fitr");
            if (adha) put(map, adha.y, adha.m, adha.d, "adha");
        }

        Object.keys(SPECIAL).forEach(function (dateKey) {
            if (dateKey.indexOf(String(year)) === 0) map[dateKey] = SPECIAL[dateKey];
        });

        var fixed = [
            [1, 1, "newyear"],
            [5, 1, "labour"],
            [6, 1, "madaraka"],
            [10, 10, "mazingira"],
            [10, 20, "mashujaa"],
            [12, 12, "jamhuri"],
            [12, 25, "christmas"],
            [12, 26, "boxing"]
        ];
        fixed.forEach(function (row) { put(map, year, row[0], row[1], row[2]); });

        var easter = easterSunday(year);
        var friday = addDays(year, easter.m, easter.d, -2);
        var monday = addDays(year, easter.m, easter.d, 1);
        put(map, friday.y, friday.m, friday.d, "goodfriday");
        put(map, monday.y, monday.m, monday.d, "easter");

        Object.keys(map).forEach(function (dateKey) {
            var bits = dateKey.split("-");
            var y = +bits[0];
            var m = +bits[1];
            var d = +bits[2];
            var id = map[dateKey];
            if (id === "diwali" || id === "adha" || id === "election") return;
            if (weekday(y, m, d) !== 0) return;
            var next = addDays(y, m, d, 1);
            var nextKey = key(next.y, next.m, next.d);
            if (!map[nextKey]) map[nextKey] = id;
        });

        return map;
    }

    function holidayOn(date) {
        var parts = nairobiParts(date || new Date());
        var id = calendar(parts.y)[key(parts.y, parts.m, parts.d)];
        if (!id) return null;
        return { id: id, name: SCENES[id], year: parts.y };
    }

    function mark(inner) {
        return '<svg class="ksl-doodle-mark" viewBox="0 0 16 16" aria-hidden="true">' + inner + '</svg>';
    }

    function strokeIcon(d) {
        return mark('<path d="' + d + '" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>');
    }

    function flagIcon() {
        return mark(
            '<path d="M2.2 1.6h1.1v12.8H2.2z" fill="currentColor"/>' +
            '<path d="M3.3 2h9.2v3.4H3.3z" fill="#111"/>' +
            '<path d="M3.3 5.6h9.2v3.4H3.3z" fill="#BB0000"/>' +
            '<path d="M3.3 9.2h9.2v3.4H3.3z" fill="#006600"/>' +
            '<path d="M3.3 5.4h9.2v.5H3.3zM3.3 8.9h9.2v.5H3.3z" fill="#fff"/>'
        );
    }

    function iconFor(id) {
        if (id === "newyear") return strokeIcon("M8 1.8v2.2M8 12v2.2M1.8 8h2.2M12 8h2.2M3.4 3.4l1.5 1.5M11.1 11.1l1.5 1.5M12.6 3.4l-1.5 1.5M4.9 11.1l-1.5 1.5M8 5.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6z");
        if (id === "goodfriday") return strokeIcon("M8 2.2v11.6M4.2 5.4h7.6");
        if (id === "easter") return strokeIcon("M8 2.4c2.4 1.2 3.6 3.2 3.6 5.4 0 3-1.6 5.8-3.6 5.8S4.4 10.8 4.4 7.8C4.4 5.6 5.6 3.6 8 2.4zM5.6 8.2h4.8");
        if (id === "labour") return strokeIcon("M8 2.4v1.4M8 12.2v1.4M2.4 8h1.4M12.2 8h1.4M4 4l1 1M11 11l1 1M12 4l-1 1M5 11l-1 1M8 5.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6z");
        if (id === "madaraka" || id === "jamhuri") return flagIcon();
        if (id === "fitr" || id === "adha") return mark('<path fill="currentColor" d="M9.2 2.2a5.2 5.2 0 1 0 0 11.6 4.2 4.2 0 1 1 0-11.6z"/>');
        if (id === "mazingira") return mark('<path fill="currentColor" d="M8 14.2V8.4M8 8.4C8 4.6 4.2 3.2 3.2 6.2 1.6 6.4 1.8 9 3.6 9.2 4.2 11.4 6.4 12 8 10.6 9.6 12 11.8 11.4 12.4 9.2 14.2 9 14.4 6.4 12.8 6.2 11.8 3.2 8 4.6 8 8.4z"/>');
        if (id === "mashujaa") return mark('<path fill="currentColor" d="M3 2.2h10l-1.2 3.2 2.2 1.6-2.2.8 1.2 3.2H3l1.2-3.2L2 7l2.2-1.6z"/><circle cx="8" cy="7.2" r="1.3" fill="#fff"/>');
        if (id === "christmas") return mark('<path fill="currentColor" d="M8 1.6l1.1 3.2 3.3.2-2.6 2 1 3.2L8 8.6 5.2 10.2l1-3.2-2.6-2 3.3-.2z"/>');
        if (id === "boxing") return strokeIcon("M3 5.2h10v7.2H3zM3 8h10M8 5.2v7.2");
        if (id === "diwali") return mark('<path fill="currentColor" d="M3.2 11.2c1.6-.8 7.8-.8 9.6 0-.6 2.2-9 2.2-9.6 0z"/><path fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" d="M8 10.2c0-2.6.8-4.4.8-4.4S9.6 7.6 9.6 10"/>');
        if (id === "election") return strokeIcon("M3.2 2.4h6.2v11.2H3.2zM4.8 5.2h3.2M4.8 7.4h3.2M4.8 9.6h2M11 8.2l1.3 1.3 2.4-2.8");
        return "";
    }

    function requestedId() {
        if (typeof location === "undefined") return "";
        var params = new URLSearchParams(location.search);
        var id = params.get("ksl-doodle") || "";
        return SCENES[id] ? id : "";
    }

    function mount() {
        var brand = document.querySelector(".navbar .navbar-brand");
        var img = brand && brand.querySelector(".ksl-logo");
        if (!brand || !img || brand.querySelector(".ksl-doodle-note")) return;

        var preview = requestedId();
        var today = nairobiParts(new Date());
        var holiday = preview
            ? { id: preview, name: SCENES[preview], year: today.y }
            : holidayOn(new Date());
        if (!holiday) return;

        var copy = document.createElement("span");
        copy.className = "ksl-brand-copy";
        var word = brand.querySelector(".ksl-wordmark");
        if (word) copy.appendChild(word);

        var note = document.createElement("span");
        note.className = "ksl-doodle-note";
        note.setAttribute("data-holiday", holiday.id);
        var labelText = holiday.id === "newyear" ? holiday.name + " " + holiday.year : holiday.name;
        note.innerHTML = iconFor(holiday.id) + "<span>" + labelText + "</span>";
        copy.appendChild(note);
        brand.appendChild(copy);

        var label = brand.getAttribute("aria-label") || "Kenya Shipyards Limited home";
        if (label.indexOf(holiday.name) === -1) {
            brand.setAttribute("aria-label", label + ", " + holiday.name);
        }
        brand.setAttribute("title", holiday.name);
    }

    return { mount: mount, holidayOn: holidayOn, calendar: calendar, scenes: SCENES };
});
