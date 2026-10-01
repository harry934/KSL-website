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
                empty.className = "ksl-empty-state";
                empty.setAttribute("role", "status");
                empty.innerHTML =
                    '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2"></rect><path d="M8 8h8M8 12h8M8 16h5"></path></svg>' +
                    "<h3>No open vacancies</h3>" +
                    "<p>There are no advertised roles at the moment. Send your CV for future opportunities.</p>" +
                    '<div class="ksl-empty-state-actions"><a class="btn btn-primary" href="mailto:careers@kenyashipyards.co.ke">Email careers</a><a class="btn btn-outline-primary" href="contact.html">Contact us</a></div>';
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
        });
})();
