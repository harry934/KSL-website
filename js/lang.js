(function () {
    var KEY = "ksl-lang";
    var sw = {
        "Sustainability": "Uendelevu",
        "FAQ": "Maswali",
        "CSR": "Uwajibikaji",
        "Careers": "Kazi",
        "More": "Zaidi",
        "Home": "Nyumbani",
        "About KSL": "Kuhusu KSL",
        "Who We Are": "Sisi ni nani",
        "KSL Board": "Bodi ya KSL",
        "Organization structure": "Muundo wa shirika",
        "Organization Structure": "Muundo wa shirika",
        "Services": "Huduma",
        "Products": "Bidhaa",
        "Projects": "Miradi",
        "Media Center": "Kituo cha Habari",
        "News & Events": "Habari na Matukio",
        "News and Events": "Habari na Matukio",
        "Gallery": "Ghala la Picha",
        "Video Gallery": "Ghala la Picha",
        "Photos": "Picha",
        "Videos": "Video",
        "Downloads": "Vipakuliwa",
        "Contact Us": "Wasiliana nasi",
        "Contact US": "Wasiliana nasi",
        "Search": "Tafuta",
        "Open menu": "Fungua menyu",
        "Strategic Plan": "Mpango wa Kimkakati",
        "Product Catalogue": "Katalogi ya Bidhaa",
        "KSL Brochure": "Brosha ya KSL",
        "Access to Information": "Upatikanaji wa Taarifa",
        "Show Access to Information": "Onyesha Upatikanaji wa Taarifa",
        "Request For Information": "Ombi la Taarifa",
        "Records Containing Personal Information": "Kumbukumbu zenye Taarifa Binafsi",
        "Withdrawal of request for Information": "Kujitoa kwa ombi la taarifa",
        "Request for review by the Commission": "Ombi la ukaguzi na Tume",
        "Customer Complaint Form": "Fomu ya Malalamiko ya Mteja",
        "Citizen Service Delivery Charter": "Mkataba wa Huduma kwa Raia",
        "Show Citizen Service Delivery Charter": "Onyesha Mkataba wa Huduma kwa Raia",
        "English Version": "Toleo la Kiingereza",
        "Kiswahili Version": "Toleo la Kiswahili",
        "Catalyzing Shipbuilding Industry": "Kuchochea Sekta ya Ujenzi wa Meli",
        "From Mombasa and Kisumu, we build and refit the vessels that keep Eastern Africa moving.": "Kutoka Mombasa na Kisumu, tunajenga na kukarabati vyombo vinavyoendeleza Afrika Mashariki.",
        "Read our story": "Soma hadithi yetu",
        "How we work": "Jinsi tunavyofanya kazi",
        "Quality": "Ubora",
        "Improvement": "Uboreshaji",
        "Customers": "Wateja",
        "Partnerships": "Ushirikiano",
        "Pricing": "Bei",
        "Every job planned, checked and recorded.": "Kila kazi hupangwa, hukaguliwa na kurekodiwa.",
        "Lessons from each build shape the next.": "Mafunzo ya kila ujenzi huboresha unaofuata.",
        "Each brief starts with the client's needs.": "Kila agizo huanza na mahitaji ya mteja.",
        "Partners across Eastern Africa and beyond.": "Washirika kote Afrika Mashariki na zaidi.",
        "Competitive quotes for local and global clients.": "Bei shindani kwa wateja wa ndani na wa kimataifa.",
        "Who we are": "Sisi ni nani",
        "About Kenya Shipyards Limited": "Kuhusu Kenya Shipyards Limited",
        "Kenya Shipyards Limited was incorporated on 29 September 2020 to lead shipbuilding in Eastern Africa. It builds, repairs, and refits vessels for the Kenya Navy, ministries, departments and agencies, and other public and private clients.": "Kenya Shipyards Limited ilianzishwa tarehe 29 Septemba 2020 kuongoza ujenzi wa meli Afrika Mashariki. Inajenga, kukarabati na kurekebisha vyombo kwa Jeshi la Wanamaji la Kenya, wizara, idara na mashirika, na wateja wengine wa umma na binafsi.",
        "KSL is a state corporation under the Ministry of Defence. Headquarters is at Herufi House, Treasury Buildings, Nairobi. The yards are in Mombasa, next to Kenya Navy Base at Mtongwe, and in Kisumu, next to the port along Marine Drive.": "KSL ni shirika la umma chini ya Wizara ya Ulinzi. Makao makuu yako Herufi House, Majengo ya Hazina, Nairobi. Viwanja viko Mombasa, karibu na Kituo cha Jeshi la Wanamaji Mtongwe, na Kisumu, karibu na bandari kando ya Marine Drive.",
        "The company is ISO 9001 certified. Work covers new construction, maintenance and overhaul, civil and modular yard works, and heavy engineering.": "Kampuni imethibitishwa ISO 9001. Kazi inahusu ujenzi mpya, matengenezo na ukaguzi, kazi za ujenzi na moduli, na uhandisi mazito.",
        "Years of shipbuilding": "Miaka ya ujenzi wa meli",
        "Shipyards": "Viwanja vya meli",
        "9001 quality system": "Mfumo wa ubora wa 9001",
        "Request for a quote": "Omba bei",
        "What we do": "Tunachofanya",
        "Shipbuilding and engineering": "Ujenzi wa meli na uhandisi",
        "Ship Construction": "Ujenzi wa Meli",
        "New builds for the Kenya Navy, MDAs, and regional clients.": "Ujenzi mpya kwa Jeshi la Wanamaji la Kenya, wizara na wateja wa kikanda.",
        "Patrol craft, ferries, and support vessels, designed and built for the Kenya Navy, MDAs, and regional partners.": "Vyombo vya doria, feri na usaidizi, vimeundwa na kujengwa kwa Jeshi la Wanamaji la Kenya, wizara na washirika wa kikanda.",
        "Marine civil works, piers, jetties, linkspans, and modular structures that keep ports and yards operating.": "Kazi za ujenzi wa baharini, madaraja, gati, linkspan na miundo ya moduli inayowezesha bandari na viwanja kufanya kazi.",
        "Large scale fabrication, locomotives, steel structures, and industrial plant for rail, energy, and defence.": "Utengenezaji wa kiwango kikubwa, injini za reli, miundo ya chuma na viwanda kwa reli, nishati na ulinzi.",
        "Scheduled refits, emergency repairs, and dry docking to keep fleets mission ready and class compliant.": "Ukarabati wa ratiba, matengenezo ya dharura na kukausha meli ili meli ziwe tayari na zikidhi viwango.",
        "Light, durable GRP hulls for patrol, fisheries, ambulance response, and county water transport.": "Meli nyepesi na imara za GRP kwa doria, uvuvi, huduma za dharura na usafiri wa maji wa kaunti.",
        "Civil and Modular Works": "Kazi za Ujenzi na Moduli",
        "Piers, jetties, linkspans, and yard infrastructure.": "Madaraja, gati, linkspan na miundombinu ya uwanja.",
        "Heavy Engineering": "Uhandisi Mazito",
        "Locomotives and heavy fabrication beyond the waterline.": "Injini za reli na utengenezaji mzito nje ya maji.",
        "Maintenance Repair and Overhaul": "Matengenezo, Ukarabati na Ukaguzi",
        "Refit, dry dock, and class ready repairs.": "Ukarabati, kizimbani kikavu na matengenezo ya kiwango cha daraja.",
        "GRP Boats": "Boti za GRP",
        "Patrol, fishing, ambulance, and county workboats.": "Boti za doria, uvuvi, ambulansi na kazi za kaunti.",
        "Read More": "Soma zaidi",
        "Projects Delivered": "Miradi Iliyokamilika",
        "Years of Shipbuilding": "Miaka ya Ujenzi wa Meli",
        "ISO 9001 System": "Mfumo wa ISO 9001",
        "Why Choose": "Kwa nini utuchague",
        "Kenya Shipyards Limited?": "Kenya Shipyards Limited?",
        "With 5 years of experience in the shipbuilding industry, we don’t just build ships we build trust. With ISO 9001 certification and strategically located facilities in Mombasa and Kisumu, we offer world class infrastructure backed by a skilled, certified and readily available workforce. Total quality, safety, and cost efficiency are at the core of every project.": "Kwa miaka 5 katika sekta ya ujenzi wa meli, hatujengi meli tu bali tunajenga imani. Kwa uidhinishaji wa ISO 9001 na vituo vya Mombasa na Kisumu, tunatoa miundombinu ya kiwango cha dunia ikisaidiwa na wafanyakazi stadi. Ubora, usalama na gharama ndogo ndio msingi wa kila mradi.",
        "As a state corporation under the Ministry of Defence we operate with discipline, accountability and high standards.": "Kama shirika la umma chini ya Wizara ya Ulinzi, tunafanya kazi kwa nidhamu, uwajibikaji na viwango vya juu.",
        "Choosing KSL means choosing experience, commitment, and a trusted partner.": "Kumchagua KSL ni kuchagua uzoefu, kujitolea, na mshirika wa kuaminika.",
        "Mombasa Shipyard": "Uwanja wa Meli wa Mombasa",
        "Mtongwe aerial view": "Mwonekano wa angani wa Mtongwe",
        "Our yards": "Viwanja vyetu",
        "Kisumu and Mombasa": "Kisumu na Mombasa",
        "Kisumu Shipyard": "Uwanja wa Meli wa Kisumu",
        "View Kisumu Shipyard": "Tazama Uwanja wa Kisumu",
        "Kisumu specifications": "Maelezo ya Kisumu",
        "View Mombasa Shipyard": "Tazama Uwanja wa Mombasa",
        "Mombasa specifications": "Maelezo ya Mombasa",
        "Upcoming events": "Matukio yajayo",
        "Events": "Matukio",
        "Nairobi International Trade Fair": "Maonesho ya Kimataifa ya Biashara ya Nairobi",
        "Jamhuri Park, Nairobi · 3 Oct 2026 · 8:00 am to 5:00 pm (Africa/Nairobi)": "Jamhuri Park, Nairobi · 3 Okt 2026 · 8:00 asubuhi to 5:00 jioni (Afrika/Nairobi)",
        "Promoting Innovation and Technology in Agriculture and Trade.": "Kukuza ubunifu na teknolojia katika kilimo na biashara.",
        "Attend": "Hudhuria",
        "Clients": "Wateja",
        "Partners": "Washirika",
        "News Room": "Chumba cha Habari",
        "News": "Habari",
        "The Future of Shipbuilding in Kenya: Unlocking Maritime Potential": "Mustakabali wa Ujenzi wa Meli Kenya: Kufungua Uwezo wa Baharini",
        "shipyards · March 27, 2025 · News · No Comments": "viwanja vya meli · 27 Machi 2025 · Habari · Hakuna maoni",
        "Kenya’s maritime industry is experiencing a renaissance, with shipbuilding emerging as a critical pillar in the country’s economic growth.": "Sekta ya bahari ya Kenya inastawi upya, na ujenzi wa meli ukiibuka kama nguzo muhimu ya ukuaji wa uchumi.",
        "eProcurement": "Ununuzi wa Kielektroniki",
        "User Manual": "Mwongozo wa Mtumiaji",
        "Tender Documents": "Nyaraka za Zabuni",
        "Tender Notice": "Tangazo la Zabuni",
        "Tender Application": "Maombi ya Zabuni",
        "Service Charter (English)": "Mkataba wa Huduma (Kiingereza)",
        "Important Links": "Viungo Muhimu",
        "Ministry of Defence": "Wizara ya Ulinzi",
        "Kenya Revenue Authority": "Mamlaka ya Mapato ya Kenya",
        "Kenya Ports Authority": "Mamlaka ya Bandari ya Kenya",
        "Kenya Coast Guard Service": "Huduma ya Walinzi wa Pwani ya Kenya",
        "Enquiry": "Ulizo",
        "Locations": "Maeneo",
        "Nairobi Head Office": "Ofisi Kuu ya Nairobi",
        "Herufi House, Treasury Buildings.": "Herufi House, Majengo ya Hazina.",
        "Next to Kenya Navy Base, Mtongwe.": "Karibu na Kituo cha Jeshi la Wanamaji, Mtongwe.",
        "Next to Kisumu Port, along Marine Drive.": "Karibu na Bandari ya Kisumu, kando ya Marine Drive.",
        "Head Office": "Ofisi Kuu",
        "Inquiries / complaints": "Maswali / malalamiko",
        "Office of the MD": "Ofisi ya Mkurugenzi Mtendaji",
        "Address": "Anwani",
        "Herufi House, Treasury Buildings, Nairobi, Kenya": "Herufi House, Majengo ya Hazina, Nairobi, Kenya",
        "P.O. Box 9706 00200 Nairobi": "S.L.P. 9706 00200 Nairobi",
        "© 2025, All Rights Reserved by Kenya Shipyards Limited": "© 2025, Haki zote zimehifadhiwa na Kenya Shipyards Limited",
        "WhatsApp us": "Tuandikie WhatsApp",
        "Search news...": "Tafuta habari...",
        "Search...": "Tafuta...",
        "Language": "Lugha",
        "Videos": "Video",
        "Our Services": "Huduma zetu",
        "Our Projects": "Miradi yetu",
        "Frequently Asked Questions": "Maswali Yanayoulizwa Mara kwa Mara",
        "Corporate Documents": "Nyaraka za Kampuni",
        "Corporate Social Responsibility": "Uwajibikaji wa Kijamii wa Kampuni",
        "Careers Opportunities": "Fursa za Kazi",
        "News article": "Makala ya habari",
        "Page not found": "Ukurasa haujapatikana",
        "Mombasa Shipyard · Mtongwe": "Uwanja wa Meli wa Mombasa · Mtongwe",
        "Marine infrastructure · Linkspan": "Miundombinu ya baharini · Linkspan",
        "Vessel construction · Passenger ferry": "Ujenzi wa vyombo · Feri ya abiria",
        "Aerial view of Mombasa Shipyard at Mtongwe": "Mwonekano wa angani wa Uwanja wa Meli wa Mombasa, Mtongwe",
        "Mombasa shipyard aerial view": "Mwonekano wa angani wa uwanja wa meli wa Mombasa",
        "Kenya Shipyards Limited facilities and vessels": "Vituo na vyombo vya Kenya Shipyards Limited",
        "Accessibility": "Ufikivu",
        "Accessibility options": "Chaguo za ufikivu",
        "Close": "Funga",
        "Font Resize": "Ukubwa wa herufi",
        "smaller font size": "herufi ndogo",
        "larger font size": "herufi kubwa",
        "Keyboard navigation": "Urambazaji wa kibodi",
        "Readable Font": "Herufi rahisi kusoma",
        "Underline links": "Pigia mistari viungo",
        "Highlight Links": "Angazia viungo",
        "Clear cookies": "Futa vidakuzi",
        "Images Greyscale": "Picha nyeusi na nyeupe",
        "Invert Colors": "Geuza rangi",
        "Remove Animations": "Ondoa uhuishaji",
        "Remove styles": "Ondoa mitindo",
        "Lights Off": "Zima taa",
        "Accessibility settings cleared": "Mipangilio ya ufikivu imefutwa"
    };

    var originals = new WeakMap();

    function current() {
        return localStorage.getItem(KEY) === "sw" ? "sw" : "en";
    }

    function translateValue(value, lang) {
        if (!value) return value;
        var key = value.replace(/\s+/g, " ").trim();
        if (!sw[key]) return value;
        if (lang === "en") return value;
        var lead = value.match(/^\s*/)[0];
        var tail = value.match(/\s*$/)[0];
        return lead + sw[key] + (tail === lead ? "" : tail);
    }

    function apply(lang) {
        document.documentElement.lang = lang;
        var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
        var node;
        while ((node = walker.nextNode())) {
            var parent = node.parentElement;
            if (!parent || parent.closest("script, style")) continue;
            if (!originals.has(node)) originals.set(node, node.nodeValue);
            var source = originals.get(node);
            node.nodeValue = lang === "sw" ? translateValue(source, "sw") : source;
        }
        document.querySelectorAll("[aria-label], [placeholder], [alt], [title]").forEach(function (el) {
            ["aria-label", "placeholder", "alt", "title"].forEach(function (attr) {
                if (!el.hasAttribute(attr)) return;
                var store = "data-ksl-" + attr;
                if (!el.hasAttribute(store)) el.setAttribute(store, el.getAttribute(attr));
                var source = el.getAttribute(store);
                el.setAttribute(attr, lang === "sw" ? translateValue(source, "sw") : source);
            });
        });
        document.querySelectorAll(".top-lang button").forEach(function (btn) {
            var on = btn.getAttribute("data-lang") === lang;
            btn.classList.toggle("is-on", on);
            btn.setAttribute("aria-pressed", on ? "true" : "false");
        });
    }

    document.addEventListener("click", function (event) {
        var btn = event.target.closest(".top-lang button[data-lang]");
        if (!btn) {
            return;
        }
        var lang = btn.getAttribute("data-lang") === "sw" ? "sw" : "en";
        localStorage.setItem(KEY, lang);
        apply(lang);
    });

    apply(current());
})();