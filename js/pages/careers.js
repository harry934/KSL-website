(function () {
    "use strict";

    var list = document.getElementById("ksl-careers-list");
    var empty = document.getElementById("ksl-careers-empty");
    if (!list) {
        return;
    }

    fetch("data/careers.json")
        .then(function (res) { return res.json(); })
        .then(function (data) {
            var vacancies = data.vacancies || [];
            if (!vacancies.length && empty) {
                empty.hidden = false;
            }
            vacancies.forEach(function (job) {
                var article = document.createElement("article");
                article.className = "ksl-career-card mb-4 p-4 bg-white shadow-sm";
                article.innerHTML =
                    "<h3 class=\"h5\">" + job.title + "</h3>" +
                    "<p class=\"text-muted mb-2\">" + job.location + " · Closes " + job.closingDate + "</p>" +
                    "<p>" + job.summary + "</p>" +
                    '<a class="btn btn-primary" href="' + (job.applyUrl || ("mailto:" + data.applyEmail)) + '">Apply</a>';
                list.appendChild(article);
            });
            var intern = document.getElementById("ksl-careers-internships");
            if (intern && data.internships && data.internships.length) {
                intern.innerHTML = data.internships.map(function (row) {
                    return "<li><strong>" + row.title + "</strong> — " + row.location + ". " + row.summary + "</li>";
                }).join("");
            }
            var how = document.getElementById("ksl-careers-how");
            if (how) {
                how.textContent = data.applyNote;
            }
        });
})();
