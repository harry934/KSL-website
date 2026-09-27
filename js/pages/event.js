(function () {
    "use strict";

    var main = document.querySelector("main .container");
    if (!main || !main.querySelector(".list-group")) {
        return;
    }

    function pad(n) {
        return n < 10 ? "0" + n : String(n);
    }

    function toIcal(evt) {
        var start = evt.date.replace(/-/g, "") + "T" + (evt.timeStart || "09:00").replace(":", "") + "00";
        var end = evt.date.replace(/-/g, "") + "T" + (evt.timeEnd || "17:00").replace(":", "") + "00";
        return [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//Kenya Shipyards Limited//Events//EN",
            "BEGIN:VEVENT",
            "UID:" + evt.slug + "@kenyashipyards.co.ke",
            "DTSTART;TZID=" + (evt.timezone || "Africa/Nairobi") + ":" + start,
            "DTEND;TZID=" + (evt.timezone || "Africa/Nairobi") + ":" + end,
            "SUMMARY:" + evt.title,
            "LOCATION:" + evt.venue,
            "DESCRIPTION:" + (evt.theme || evt.description || ""),
            "END:VEVENT",
            "END:VCALENDAR"
        ].join("\r\n");
    }

    fetch("data/events.json")
        .then(function (res) { return res.json(); })
        .then(function (data) {
            var evt = (data.upcoming || [])[0];
            if (!evt) {
                return;
            }
            var actions = document.createElement("div");
            actions.className = "d-flex flex-wrap gap-2 mt-4";
            var blob = new Blob([toIcal(evt)], { type: "text/calendar;charset=utf-8" });
            var url = URL.createObjectURL(blob);
            actions.innerHTML =
                '<a class="btn btn-primary" href="' + url + '" download="ksl-event.ics">Add to calendar (.ics)</a>' +
                '<a class="btn btn-outline-primary" href="news.html">More news &amp; events</a>';
            main.appendChild(actions);

            var past = document.getElementById("ksl-events-past");
            if (past && data.past && data.past.length) {
                past.innerHTML = "<h2 class=\"h5 mt-5\">Past events</h2><ul class=\"list-group\">" +
                    data.past.map(function (p) {
                        return '<li class="list-group-item"><strong>' + p.title + "</strong><br><span class=\"text-muted\">" + p.date + " · " + p.venue + "</span><br>" + p.summary + "</li>";
                    }).join("") + "</ul>";
            }
        });
})();
