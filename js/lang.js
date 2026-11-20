/* English and Kiswahili switch. */
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
        "Video Gallery": "Ghala la Video",
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
        "Why choose us?": "Kwa nini utuchague?",
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
        "Search the site...": "Tafuta kwenye tovuti...",
        "Search the site": "Tafuta kwenye tovuti",
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
        "Accessibility settings cleared": "Mipangilio ya ufikivu imefutwa",
        "Map of Kenya showing Kisumu, Nairobi and Mombasa": "Ramani ya Kenya inayoonyesha Kisumu, Nairobi na Mombasa",
        "Lake Victoria": "Ziwa Viktoria",
        "Indian Ocean": "Bahari Hindi",
        "Headquarters": "Makao makuu",
        "Nairobi HQ": "Makao makuu Nairobi",
        "Herufi House, Treasury Buildings, Nairobi.": "Herufi House, Majengo ya Hazina, Nairobi.",
        "See yard": "Tazama uwanja",
        "Directions": "Maelekezo",
        "Contact us": "Wasiliana nasi",
        "Dry dock": "Gati kavu",
        "Slipways": "Njia za kushushia meli",
        "Slipway": "Njia ya kushushia meli",
        "Draft": "Kina cha maji",
        "Cranes": "Winchi",
        "Inquiries": "Maswali",
        "Equator": "Ikweta",
        "84m and 42m": "84m na 42m",
        "Choose a location": "Chagua eneo",
        "Our locations": "Maeneo yetu",
        "Nairobi, Kisumu and Mombasa": "Nairobi, Kisumu na Mombasa",
        "Google map of the selected location": "Ramani ya Google ya eneo lililochaguliwa",
        "Satellite view from Google Maps": "Mwonekano wa setilaiti kutoka Google Maps",
        "View location": "Tazama eneo",
        "Hide location": "Ficha eneo",
        "Select a location on the map to see its details.": "Chagua eneo kwenye ramani ili kuona maelezo yake.",
        "Google satellite view of the selected location": "Mwonekano wa setilaiti wa Google wa eneo lililochaguliwa",
        "First Name *": "Jina la kwanza *",
        "Other Name": "Jina jingine",
        "Surname *": "Jina la ukoo *",
        "Email *": "Barua pepe *",
        "Subject *": "Mada *",
        "Message *": "Ujumbe *",
        "Send message": "Tuma ujumbe",
        "Please complete the highlighted fields.": "Tafadhali jaza sehemu zilizoangaziwa.",
        "Your email app is opening with your message. If nothing opens, email publicaffairs@kenyashipyards.co.ke.": "Programu yako ya barua pepe inafunguka na ujumbe wako. Isipofunguka, tuma barua pepe kwa publicaffairs@kenyashipyards.co.ke.",
        "Language": "Lugha",
        "Choose language": "Chagua lugha",
        "Search languages": "Tafuta lugha",
        "English and Kiswahili": "Kiingereza na Kiswahili",
        "African languages": "Lugha za Afrika",
        "World languages": "Lugha za dunia",
        "No language found": "Hakuna lugha iliyopatikana",
        "Close": "Funga",
        "Languages other than English and Kiswahili are translated automatically by Google and may not be exact.": "Lugha zingine isipokuwa Kiingereza na Kiswahili zinatafsiriwa kiotomatiki na Google na huenda zisiwe sahihi kabisa.",
        "Nothing on this site matches that.": "Hakuna kilicho kwenye tovuti hii kinacholingana na hicho.",
        "That page is not on this site.": "Ukurasa huo haupo kwenye tovuti hii.",
        "Not accepted": "Haukubaliwi",
        "Your message was not sent": "Ujumbe wako haukutumwa",
        "Your message was not sent. Please write a plain message and try again.": "Ujumbe wako haukutumwa. Tafadhali andika ujumbe wa kawaida kisha ujaribu tena.",
        "That text was blocked": "Maandishi hayo yalizuiwa",
        "It looked like code, so it was not searched or sent. Write a normal message and try again.": "Yalionekana kama msimbo, kwa hiyo hayakutafutwa wala kutumwa. Andika ujumbe wa kawaida kisha ujaribu tena.",
        "Back to Home": "Rudi nyumbani",
        "Input blocked | Kenya Shipyards Limited": "Maingizo yamezuiwa | Kenya Shipyards Limited",
        "Scroll to learn more about Kenya Shipyards Limited": "Sogeza chini ili kujifunza zaidi kuhusu Kenya Shipyards Limited",
        "Page not found | Kenya Shipyards Limited": "Ukurasa haujapatikana | Kenya Shipyards Limited"
    };

    var LANGS = [
        { code: "en", name: "English", en: "English", group: "official" },
        { code: "sw", name: "Kiswahili", en: "Swahili", group: "official" },
        { code: "ach", name: "Lwo (Acholi)", en: "Acholi", group: "africa" },
        { code: "aa", name: "Afar", en: "Afar", group: "africa" },
        { code: "af", name: "Afrikaans", en: "Afrikaans", group: "africa" },
        { code: "alz", name: "Alur", en: "Alur", group: "africa" },
        { code: "am", name: "አማርኛ", en: "Amharic", group: "africa" },
        { code: "ar", name: "العربية", en: "Arabic", group: "africa" },
        { code: "bm", name: "Bambara", en: "Bambara", group: "africa" },
        { code: "bci", name: "Baoulé", en: "Baoulé", group: "africa" },
        { code: "bem", name: "Bemba", en: "Bemba", group: "africa" },
        { code: "ny", name: "Chichewa", en: "Chichewa", group: "africa" },
        { code: "din", name: "Thuɔŋjäŋ", en: "Dinka", group: "africa" },
        { code: "dov", name: "Dombe", en: "Dombe", group: "africa" },
        { code: "dyu", name: "Dyula", en: "Dyula", group: "africa" },
        { code: "ee", name: "Ewe", en: "Ewe", group: "africa" },
        { code: "fon", name: "Fon", en: "Fon", group: "africa" },
        { code: "fr", name: "Français", en: "French", group: "africa" },
        { code: "ff", name: "Fulfulde", en: "Fulani", group: "africa" },
        { code: "gaa", name: "Ga", en: "Ga", group: "africa" },
        { code: "ha", name: "Hausa", en: "Hausa", group: "africa" },
        { code: "ig", name: "Igbo", en: "Igbo", group: "africa" },
        { code: "kr", name: "Kanuri", en: "Kanuri", group: "africa" },
        { code: "cgg", name: "Kiga", en: "Kiga", group: "africa" },
        { code: "kg", name: "Kikongo", en: "Kikongo", group: "africa" },
        { code: "rw", name: "Ikinyarwanda", en: "Kinyarwanda", group: "africa" },
        { code: "rn", name: "Ikirundi", en: "Kirundi", group: "africa" },
        { code: "ktu", name: "Kituba", en: "Kituba", group: "africa" },
        { code: "kri", name: "Krio", en: "Krio", group: "africa" },
        { code: "ln", name: "Lingála", en: "Lingala", group: "africa" },
        { code: "lg", name: "Luganda", en: "Luganda", group: "africa" },
        { code: "mg", name: "Malagasy", en: "Malagasy", group: "africa" },
        { code: "mfe", name: "Mauritian Creole", en: "Mauritian Creole", group: "africa" },
        { code: "bm-Nkoo", name: "N'Ko", en: "N'Ko", group: "africa" },
        { code: "ndc-ZW", name: "Ndau", en: "Ndau", group: "africa" },
        { code: "nr", name: "isiNdebele", en: "Ndebele (South)", group: "africa" },
        { code: "nus", name: "Thok Naath", en: "Nuer", group: "africa" },
        { code: "om", name: "Afaan Oromoo", en: "Oromo", group: "africa" },
        { code: "pt", name: "Português", en: "Portuguese", group: "africa" },
        { code: "sg", name: "Sango", en: "Sango", group: "africa" },
        { code: "nso", name: "Sepedi", en: "Sepedi", group: "africa" },
        { code: "st", name: "Sesotho", en: "Sesotho", group: "africa" },
        { code: "crs", name: "Seychellois Creole", en: "Seychellois Creole", group: "africa" },
        { code: "sn", name: "chiShona", en: "Shona", group: "africa" },
        { code: "so", name: "Af-Soomaali", en: "Somali", group: "africa" },
        { code: "sus", name: "Susu", en: "Susu", group: "africa" },
        { code: "ss", name: "siSwati", en: "Swati", group: "africa" },
        { code: "ber-Latn", name: "Tamazight", en: "Tamazight", group: "africa" },
        { code: "ber", name: "Tamazight (Tifinagh)", en: "Tamazight (Tifinagh)", group: "africa" },
        { code: "ti", name: "ትግርኛ", en: "Tigrinya", group: "africa" },
        { code: "tiv", name: "Tiv", en: "Tiv", group: "africa" },
        { code: "lua", name: "Tshiluba", en: "Tshiluba", group: "africa" },
        { code: "ts", name: "Xitsonga", en: "Tsonga", group: "africa" },
        { code: "tn", name: "Setswana", en: "Tswana", group: "africa" },
        { code: "tum", name: "Tumbuka", en: "Tumbuka", group: "africa" },
        { code: "ak", name: "Twi", en: "Twi (Akan)", group: "africa" },
        { code: "ve", name: "Tshivenḓa", en: "Venda", group: "africa" },
        { code: "wo", name: "Wolof", en: "Wolof", group: "africa" },
        { code: "xh", name: "isiXhosa", en: "Xhosa", group: "africa" },
        { code: "yo", name: "Yorùbá", en: "Yoruba", group: "africa" },
        { code: "zu", name: "isiZulu", en: "Zulu", group: "africa" },
        { code: "ab", name: "Abkhaz", en: "Abkhaz", group: "world" },
        { code: "ace", name: "Acehnese", en: "Acehnese", group: "world" },
        { code: "sq", name: "Shqip", en: "Albanian", group: "world" },
        { code: "hy", name: "Հայերեն", en: "Armenian", group: "world" },
        { code: "as", name: "অসমীয়া", en: "Assamese", group: "world" },
        { code: "av", name: "Avar", en: "Avar", group: "world" },
        { code: "awa", name: "Awadhi", en: "Awadhi", group: "world" },
        { code: "ay", name: "Aymara", en: "Aymara", group: "world" },
        { code: "az", name: "Azərbaycan", en: "Azerbaijani", group: "world" },
        { code: "ban", name: "Balinese", en: "Balinese", group: "world" },
        { code: "bal", name: "Baluchi", en: "Baluchi", group: "world" },
        { code: "ba", name: "Bashkir", en: "Bashkir", group: "world" },
        { code: "eu", name: "Euskara", en: "Basque", group: "world" },
        { code: "btx", name: "Batak Karo", en: "Batak Karo", group: "world" },
        { code: "bts", name: "Batak Simalungun", en: "Batak Simalungun", group: "world" },
        { code: "bbc", name: "Batak Toba", en: "Batak Toba", group: "world" },
        { code: "be", name: "Беларуская", en: "Belarusian", group: "world" },
        { code: "bn", name: "বাংলা", en: "Bengali", group: "world" },
        { code: "bew", name: "Betawi", en: "Betawi", group: "world" },
        { code: "bho", name: "Bhojpuri", en: "Bhojpuri", group: "world" },
        { code: "bik", name: "Bikol", en: "Bikol", group: "world" },
        { code: "bs", name: "Bosanski", en: "Bosnian", group: "world" },
        { code: "br", name: "Breton", en: "Breton", group: "world" },
        { code: "bg", name: "Български", en: "Bulgarian", group: "world" },
        { code: "bua", name: "Buryat", en: "Buryat", group: "world" },
        { code: "yue", name: "粵語", en: "Cantonese", group: "world" },
        { code: "ca", name: "Català", en: "Catalan", group: "world" },
        { code: "ceb", name: "Cebuano", en: "Cebuano", group: "world" },
        { code: "ch", name: "Chamorro", en: "Chamorro", group: "world" },
        { code: "ce", name: "Chechen", en: "Chechen", group: "world" },
        { code: "zh-CN", name: "简体中文", en: "Chinese (Simplified)", group: "world" },
        { code: "zh-TW", name: "繁體中文", en: "Chinese (Traditional)", group: "world" },
        { code: "chk", name: "Chuukese", en: "Chuukese", group: "world" },
        { code: "cv", name: "Chuvash", en: "Chuvash", group: "world" },
        { code: "co", name: "Corsican", en: "Corsican", group: "world" },
        { code: "crh", name: "Crimean Tatar (Cyrillic)", en: "Crimean Tatar (Cyrillic)", group: "world" },
        { code: "crh-Latn", name: "Crimean Tatar (Latin)", en: "Crimean Tatar (Latin)", group: "world" },
        { code: "hr", name: "Hrvatski", en: "Croatian", group: "world" },
        { code: "cs", name: "Čeština", en: "Czech", group: "world" },
        { code: "da", name: "Dansk", en: "Danish", group: "world" },
        { code: "fa-AF", name: "دری", en: "Dari", group: "world" },
        { code: "dv", name: "Dhivehi", en: "Dhivehi", group: "world" },
        { code: "doi", name: "Dogri", en: "Dogri", group: "world" },
        { code: "nl", name: "Nederlands", en: "Dutch", group: "world" },
        { code: "dz", name: "Dzongkha", en: "Dzongkha", group: "world" },
        { code: "eo", name: "Esperanto", en: "Esperanto", group: "world" },
        { code: "et", name: "Eesti", en: "Estonian", group: "world" },
        { code: "fo", name: "Faroese", en: "Faroese", group: "world" },
        { code: "fj", name: "Fijian", en: "Fijian", group: "world" },
        { code: "tl", name: "Filipino", en: "Filipino", group: "world" },
        { code: "fi", name: "Suomi", en: "Finnish", group: "world" },
        { code: "fr-CA", name: "Français (Canada)", en: "French (Canada)", group: "world" },
        { code: "fy", name: "Frisian", en: "Frisian", group: "world" },
        { code: "fur", name: "Friulian", en: "Friulian", group: "world" },
        { code: "gl", name: "Galego", en: "Galician", group: "world" },
        { code: "ka", name: "ქართული", en: "Georgian", group: "world" },
        { code: "de", name: "Deutsch", en: "German", group: "world" },
        { code: "el", name: "Ελληνικά", en: "Greek", group: "world" },
        { code: "gn", name: "Guarani", en: "Guarani", group: "world" },
        { code: "gu", name: "ગુજરાતી", en: "Gujarati", group: "world" },
        { code: "ht", name: "Haitian Creole", en: "Haitian Creole", group: "world" },
        { code: "cnh", name: "Hakha Chin", en: "Hakha Chin", group: "world" },
        { code: "haw", name: "Hawaiian", en: "Hawaiian", group: "world" },
        { code: "iw", name: "עברית", en: "Hebrew", group: "world" },
        { code: "hil", name: "Hiligaynon", en: "Hiligaynon", group: "world" },
        { code: "hi", name: "हिन्दी", en: "Hindi", group: "world" },
        { code: "hmn", name: "Hmong", en: "Hmong", group: "world" },
        { code: "hu", name: "Magyar", en: "Hungarian", group: "world" },
        { code: "hrx", name: "Hunsrik", en: "Hunsrik", group: "world" },
        { code: "iba", name: "Iban", en: "Iban", group: "world" },
        { code: "is", name: "Íslenska", en: "Icelandic", group: "world" },
        { code: "ilo", name: "Ilocano", en: "Ilocano", group: "world" },
        { code: "id", name: "Bahasa Indonesia", en: "Indonesian", group: "world" },
        { code: "iu-Latn", name: "Inuktut (Latin)", en: "Inuktut (Latin)", group: "world" },
        { code: "iu", name: "Inuktut (Syllabics)", en: "Inuktut (Syllabics)", group: "world" },
        { code: "ga", name: "Gaeilge", en: "Irish Gaelic", group: "world" },
        { code: "it", name: "Italiano", en: "Italian", group: "world" },
        { code: "jam", name: "Jamaican Patois", en: "Jamaican Patois", group: "world" },
        { code: "ja", name: "日本語", en: "Japanese", group: "world" },
        { code: "jw", name: "Javanese", en: "Javanese", group: "world" },
        { code: "kac", name: "Jingpo", en: "Jingpo", group: "world" },
        { code: "kl", name: "Kalaallisut", en: "Kalaallisut", group: "world" },
        { code: "kn", name: "ಕನ್ನಡ", en: "Kannada", group: "world" },
        { code: "pam", name: "Kapampangan", en: "Kapampangan", group: "world" },
        { code: "kk", name: "Қазақ", en: "Kazakh", group: "world" },
        { code: "kha", name: "Khasi", en: "Khasi", group: "world" },
        { code: "km", name: "ខ្មែរ", en: "Khmer", group: "world" },
        { code: "trp", name: "Kokborok", en: "Kokborok", group: "world" },
        { code: "kv", name: "Komi", en: "Komi", group: "world" },
        { code: "gom", name: "Konkani", en: "Konkani", group: "world" },
        { code: "ko", name: "한국어", en: "Korean", group: "world" },
        { code: "ku", name: "Kurdî", en: "Kurdish (Kurmanji)", group: "world" },
        { code: "ckb", name: "کوردی", en: "Kurdish (Sorani)", group: "world" },
        { code: "ky", name: "Kyrgyz", en: "Kyrgyz", group: "world" },
        { code: "lo", name: "ລາວ", en: "Lao", group: "world" },
        { code: "ltg", name: "Latgalian", en: "Latgalian", group: "world" },
        { code: "la", name: "Latin", en: "Latin", group: "world" },
        { code: "lv", name: "Latviešu", en: "Latvian", group: "world" },
        { code: "lij", name: "Ligurian", en: "Ligurian", group: "world" },
        { code: "li", name: "Limburgish", en: "Limburgish", group: "world" },
        { code: "lt", name: "Lietuvių", en: "Lithuanian", group: "world" },
        { code: "lmo", name: "Lombard", en: "Lombard", group: "world" },
        { code: "lb", name: "Luxembourgish", en: "Luxembourgish", group: "world" },
        { code: "mk", name: "Македонски", en: "Macedonian", group: "world" },
        { code: "mad", name: "Madurese", en: "Madurese", group: "world" },
        { code: "mai", name: "Maithili", en: "Maithili", group: "world" },
        { code: "mak", name: "Makassar", en: "Makassar", group: "world" },
        { code: "ms", name: "Bahasa Melayu", en: "Malay", group: "world" },
        { code: "ms-Arab", name: "Malay (Jawi)", en: "Malay (Jawi)", group: "world" },
        { code: "ml", name: "മലയാളം", en: "Malayalam", group: "world" },
        { code: "mt", name: "Malti", en: "Maltese", group: "world" },
        { code: "mam", name: "Mam", en: "Mam", group: "world" },
        { code: "gv", name: "Manx", en: "Manx", group: "world" },
        { code: "mi", name: "Maori", en: "Maori", group: "world" },
        { code: "mr", name: "मराठी", en: "Marathi", group: "world" },
        { code: "mh", name: "Marshallese", en: "Marshallese", group: "world" },
        { code: "mwr", name: "Marwadi", en: "Marwadi", group: "world" },
        { code: "chm", name: "Meadow Mari", en: "Meadow Mari", group: "world" },
        { code: "mni-Mtei", name: "Meiteilon (Manipuri)", en: "Meiteilon (Manipuri)", group: "world" },
        { code: "min", name: "Minang", en: "Minang", group: "world" },
        { code: "lus", name: "Mizo", en: "Mizo", group: "world" },
        { code: "mn", name: "Монгол", en: "Mongolian", group: "world" },
        { code: "my", name: "မြန်မာ", en: "Myanmar (Burmese)", group: "world" },
        { code: "nhe", name: "Nahuatl (Eastern Huasteca)", en: "Nahuatl (Eastern Huasteca)", group: "world" },
        { code: "new", name: "Nepal Bhasa (Newari)", en: "Nepal Bhasa (Newari)", group: "world" },
        { code: "ne", name: "नेपाली", en: "Nepali", group: "world" },
        { code: "no", name: "Norsk", en: "Norwegian", group: "world" },
        { code: "oc", name: "Occitan", en: "Occitan", group: "world" },
        { code: "or", name: "ଓଡ଼ିଆ", en: "Odia (Oriya)", group: "world" },
        { code: "os", name: "Ossetian", en: "Ossetian", group: "world" },
        { code: "pag", name: "Pangasinan", en: "Pangasinan", group: "world" },
        { code: "pap", name: "Papiamento", en: "Papiamento", group: "world" },
        { code: "ps", name: "پښتو", en: "Pashto", group: "world" },
        { code: "fa", name: "فارسی", en: "Persian", group: "world" },
        { code: "pl", name: "Polski", en: "Polish", group: "world" },
        { code: "pt-PT", name: "Português (Portugal)", en: "Portuguese (Portugal)", group: "world" },
        { code: "pa", name: "ਪੰਜਾਬੀ", en: "Punjabi", group: "world" },
        { code: "pa-Arab", name: "پنجابی", en: "Punjabi (Shahmukhi)", group: "world" },
        { code: "qu", name: "Quechua", en: "Quechua", group: "world" },
        { code: "kek", name: "Qʼeqchiʼ", en: "Qʼeqchiʼ", group: "world" },
        { code: "rom", name: "Romani", en: "Romani", group: "world" },
        { code: "ro", name: "Română", en: "Romanian", group: "world" },
        { code: "ru", name: "Русский", en: "Russian", group: "world" },
        { code: "se", name: "Sami (North)", en: "Sami (North)", group: "world" },
        { code: "sm", name: "Samoan", en: "Samoan", group: "world" },
        { code: "sa", name: "Sanskrit", en: "Sanskrit", group: "world" },
        { code: "sat-Latn", name: "Santali (Latin)", en: "Santali (Latin)", group: "world" },
        { code: "sat", name: "Santali (Ol Chiki)", en: "Santali (Ol Chiki)", group: "world" },
        { code: "gd", name: "Scots Gaelic", en: "Scots Gaelic", group: "world" },
        { code: "sr", name: "Српски", en: "Serbian", group: "world" },
        { code: "shn", name: "Shan", en: "Shan", group: "world" },
        { code: "scn", name: "Sicilian", en: "Sicilian", group: "world" },
        { code: "szl", name: "Silesian", en: "Silesian", group: "world" },
        { code: "sd", name: "سنڌي", en: "Sindhi", group: "world" },
        { code: "si", name: "සිංහල", en: "Sinhala", group: "world" },
        { code: "sk", name: "Slovenčina", en: "Slovak", group: "world" },
        { code: "sl", name: "Slovenščina", en: "Slovenian", group: "world" },
        { code: "es", name: "Español", en: "Spanish", group: "world" },
        { code: "su", name: "Sundanese", en: "Sundanese", group: "world" },
        { code: "sv", name: "Svenska", en: "Swedish", group: "world" },
        { code: "ty", name: "Tahitian", en: "Tahitian", group: "world" },
        { code: "tg", name: "Tajik", en: "Tajik", group: "world" },
        { code: "ta", name: "தமிழ்", en: "Tamil", group: "world" },
        { code: "tt", name: "Tatar", en: "Tatar", group: "world" },
        { code: "te", name: "తెలుగు", en: "Telugu", group: "world" },
        { code: "tet", name: "Tetum", en: "Tetum", group: "world" },
        { code: "th", name: "ไทย", en: "Thai", group: "world" },
        { code: "bo", name: "Tibetan", en: "Tibetan", group: "world" },
        { code: "tpi", name: "Tok Pisin", en: "Tok Pisin", group: "world" },
        { code: "to", name: "Tongan", en: "Tongan", group: "world" },
        { code: "tcy", name: "Tulu", en: "Tulu", group: "world" },
        { code: "tr", name: "Türkçe", en: "Turkish", group: "world" },
        { code: "tk", name: "Turkmen", en: "Turkmen", group: "world" },
        { code: "tyv", name: "Tuvan", en: "Tuvan", group: "world" },
        { code: "udm", name: "Udmurt", en: "Udmurt", group: "world" },
        { code: "uk", name: "Українська", en: "Ukrainian", group: "world" },
        { code: "ur", name: "اردو", en: "Urdu", group: "world" },
        { code: "ug", name: "ئۇيغۇرچە", en: "Uyghur", group: "world" },
        { code: "uz", name: "Oʻzbek", en: "Uzbek", group: "world" },
        { code: "vec", name: "Venetian", en: "Venetian", group: "world" },
        { code: "vi", name: "Tiếng Việt", en: "Vietnamese", group: "world" },
        { code: "war", name: "Waray", en: "Waray", group: "world" },
        { code: "cy", name: "Cymraeg", en: "Welsh", group: "world" },
        { code: "sah", name: "Yakut", en: "Yakut", group: "world" },
        { code: "yi", name: "ייִדיש", en: "Yiddish", group: "world" },
        { code: "yua", name: "Yucatec Maya", en: "Yucatec Maya", group: "world" },
        { code: "zap", name: "Zapotec", en: "Zapotec", group: "world" }
    ];

    var originals = new WeakMap();

    function find(code) {
        for (var i = 0; i < LANGS.length; i++) {
            if (LANGS[i].code === code) return LANGS[i];
        }
        return null;
    }

    function stored() {
        var code = localStorage.getItem(KEY) || "en";
        return find(code) ? code : "en";
    }

    /* "en" or "sw" when the site's own text handles the language, otherwise null (Google). */
    function localMode(code) {
        return code === "en" || code === "sw" ? code : null;
    }

    function current() {
        return localMode(stored()) || "en";
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
        markCurrent();
    }

    /* Languages other than en/sw go through Google's website translator, driven by the googtrans cookie. */
    function setGoogleCookie(code) {
        var host = location.hostname;
        var expire = "expires=Thu, 01 Jan 1970 00:00:00 GMT";
        [host, "." + host.replace(/^www\./, "")].forEach(function (domain) {
            document.cookie = "googtrans=; " + expire + "; path=/; domain=" + domain;
        });
        document.cookie = "googtrans=; " + expire + "; path=/";
        if (code) document.cookie = "googtrans=/en/" + code + "; path=/";
    }

    function hasGoogleCookie() {
        return /(?:^|;\s*)googtrans=\/en\/[^;]+/.test(document.cookie);
    }

    var googleRequested = false;
    function loadGoogle() {
        if (googleRequested) return;
        googleRequested = true;
        var holder = document.createElement("div");
        holder.id = "kslGtEl";
        holder.hidden = true;
        document.body.appendChild(holder);
        window.kslGtInit = function () {
            new window.google.translate.TranslateElement({ pageLanguage: "en", autoDisplay: false }, "kslGtEl");
        };
        var s = document.createElement("script");
        s.src = "https://translate.google.com/translate_a/element.js?cb=kslGtInit";
        s.async = true;
        document.body.appendChild(s);
    }

    function switchGoogle(code, tries) {
        var combo = document.querySelector(".goog-te-combo");
        if (combo && combo.options.length > 1) {
            combo.value = code;
            combo.dispatchEvent(new Event("change"));
            return;
        }
        if ((tries || 0) < 40) {
            setTimeout(function () { switchGoogle(code, (tries || 0) + 1); }, 150);
        }
    }

    var loadingEl = null;
    var loadingTimer = null;
    function showLoading(code) {
        var lang = find(code);
        if (!loadingEl) {
            loadingEl = document.createElement("div");
            loadingEl.className = "ksl-lang-loading notranslate";
            loadingEl.setAttribute("translate", "no");
            loadingEl.setAttribute("role", "status");
            loadingEl.setAttribute("aria-live", "polite");
            loadingEl.innerHTML = '<span class="ksl-lang-loading-spin" aria-hidden="true"></span><span class="ksl-lang-loading-text"></span>';
            document.body.appendChild(loadingEl);
        }
        var label = lang ? lang.name : code;
        loadingEl.querySelector(".ksl-lang-loading-text").textContent = (current() === "sw" ? "Inapakia " : "Loading ") + label + "…";
        loadingEl.classList.add("is-on");
    }

    function hideLoading() {
        clearTimeout(loadingTimer);
        if (loadingEl) loadingEl.classList.remove("is-on");
    }

    /* Google marks <html> with translated-ltr/rtl and the target lang once the page is translated. */
    function waitForGoogle(code) {
        var root = document.documentElement;
        var want = code.split("-")[0].toLowerCase();
        var started = Date.now();
        clearTimeout(loadingTimer);
        (function poll() {
            var translated = /\btranslated-(ltr|rtl)\b/.test(root.className);
            var lang = (root.getAttribute("lang") || "").toLowerCase();
            if ((translated && lang.indexOf(want) === 0) || Date.now() - started > 15000) {
                hideLoading();
                return;
            }
            loadingTimer = setTimeout(poll, 200);
        })();
    }

    function choose(code) {
        var previous = stored();
        var local = localMode(code);
        localStorage.setItem(KEY, code);
        if (local) {
            if (hasGoogleCookie()) {
                showLoading(code);
                setGoogleCookie("");
                location.reload();
                return;
            }
            apply(local);
            return;
        }
        showLoading(code);
        waitForGoogle(code);
        setGoogleCookie(code);
        if (googleRequested && !localMode(previous)) {
            switchGoogle(code);
            markCurrent();
            return;
        }
        if (localMode(previous) === "sw") apply("en");
        loadGoogle();
        switchGoogle(code);
        markCurrent();
    }

    var ICON_GLOBE = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18"/><path d="M12 3a14 14 0 0 0 0 18"/></svg>';
    var ICON_CHEVRON = '<svg class="ksl-lang-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
    var ICON_CHECK = '<svg class="ksl-lang-check" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg>';

    var menu, backdrop, search, list, empty;

    function shortCode(code) {
        if (code === "iw") return "HE";
        return code.split("-")[0].toUpperCase();
    }

    function markCurrent() {
        var code = stored();
        document.querySelectorAll(".ksl-lang-btn-code").forEach(function (el) {
            el.textContent = shortCode(code);
        });
        if (!menu) return;
        menu.querySelectorAll(".ksl-lang-option").forEach(function (opt) {
            var on = opt.getAttribute("data-lang") === code;
            opt.classList.toggle("is-on", on);
            opt.setAttribute("aria-selected", on ? "true" : "false");
        });
    }

    function buildMenu() {
        menu = document.createElement("div");
        menu.className = "ksl-lang-menu notranslate";
        menu.id = "kslLangMenu";
        menu.setAttribute("translate", "no");
        menu.setAttribute("role", "dialog");
        menu.setAttribute("aria-label", "Choose language");
        menu.hidden = true;

        var html = '<div class="ksl-lang-head"><p>Language</p><button type="button" class="ksl-lang-close" aria-label="Close">&times;</button></div>';
        html += '<label class="ksl-lang-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';
        html += '<input type="search" placeholder="Search languages" aria-label="Search languages" autocomplete="off"></label>';
        html += '<div class="ksl-lang-list" role="listbox" aria-label="Language">';
        [
            ["official", "English and Kiswahili"],
            ["africa", "African languages"],
            ["world", "World languages"]
        ].forEach(function (group) {
            html += '<p class="ksl-lang-group">' + group[1] + "</p>";
            LANGS.filter(function (l) { return l.group === group[0]; }).forEach(function (l) {
                var dir = /^(ar|ur|fa|fa-AF|iw|ps|sd|ckb|pa-Arab|ug|yi|dv|ms-Arab)$/.test(l.code) ? ' dir="rtl"' : "";
                html += '<button type="button" class="ksl-lang-option" role="option" data-lang="' + l.code + '" lang="' + l.code + '" data-search="' + (l.name + " " + l.en).toLowerCase().replace(/"/g, "") + '">';
                html += '<span class="ksl-lang-name"' + dir + ">" + l.name + "</span>";
                if (l.name !== l.en) html += '<span class="ksl-lang-en">' + l.en + "</span>";
                html += ICON_CHECK + "</button>";
            });
        });
        html += '<p class="ksl-lang-empty" hidden>No language found</p></div>';
        html += '<p class="ksl-lang-note">Languages other than English and Kiswahili are translated automatically by Google and may not be exact.</p>';
        menu.innerHTML = html;
        backdrop = document.createElement("div");
        backdrop.className = "ksl-lang-backdrop";
        backdrop.hidden = true;
        document.body.appendChild(backdrop);
        document.body.appendChild(menu);

        search = menu.querySelector(".ksl-lang-search input");
        list = menu.querySelector(".ksl-lang-list");
        empty = menu.querySelector(".ksl-lang-empty");

        search.addEventListener("input", function () {
            var q = search.value.trim().toLowerCase();
            var any = false;
            list.querySelectorAll(".ksl-lang-option").forEach(function (opt) {
                var show = !q || opt.getAttribute("data-search").indexOf(q) !== -1;
                opt.hidden = !show;
                if (show) any = true;
            });
            list.querySelectorAll(".ksl-lang-group").forEach(function (g) {
                g.hidden = !!q;
            });
            empty.hidden = any;
        });

        menu.addEventListener("click", function (event) {
            if (event.target.closest(".ksl-lang-close")) {
                closeMenu(true);
                return;
            }
            var opt = event.target.closest(".ksl-lang-option");
            if (!opt) return;
            closeMenu(true);
            choose(opt.getAttribute("data-lang"));
        });

        menu.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                event.stopPropagation();
                closeMenu(true);
                return;
            }
            if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
            var opts = Array.prototype.filter.call(list.querySelectorAll(".ksl-lang-option"), function (o) { return !o.hidden; });
            if (!opts.length) return;
            event.preventDefault();
            var i = opts.indexOf(document.activeElement);
            i = event.key === "ArrowDown" ? Math.min(i + 1, opts.length - 1) : i - 1;
            if (i < 0) search.focus(); else opts[i].focus();
        });
    }

    var openerBtn = null;
    var mobileMq = window.matchMedia("(max-width: 991.98px)");

    function placeMenu() {
        if (!openerBtn || mobileMq.matches) {
            menu.style.top = menu.style.left = "";
            return;
        }
        var r = openerBtn.getBoundingClientRect();
        var width = menu.offsetWidth;
        menu.style.top = Math.round(r.bottom + 8) + "px";
        menu.style.left = Math.round(Math.max(12, Math.min(r.right - width, window.innerWidth - width - 12))) + "px";
    }

    function openMenu(btn) {
        openerBtn = btn;
        menu.hidden = false;
        backdrop.hidden = false;
        document.documentElement.classList.add("ksl-lang-open");
        btn.setAttribute("aria-expanded", "true");
        search.value = "";
        search.dispatchEvent(new Event("input"));
        placeMenu();
        var on = menu.querySelector(".ksl-lang-option.is-on");
        list.scrollTop = 0;
        if (on && stored() !== "en") {
            var top = on.offsetTop - list.offsetTop;
            if (top + on.offsetHeight > list.clientHeight) list.scrollTop = top - list.clientHeight / 2 + on.offsetHeight / 2;
        }
        if (!mobileMq.matches) search.focus({ preventScroll: true });
        else if (on) on.focus({ preventScroll: true });
    }

    function closeMenu(returnFocus) {
        if (!menu || menu.hidden) return;
        menu.hidden = true;
        backdrop.hidden = true;
        document.documentElement.classList.remove("ksl-lang-open");
        if (openerBtn) {
            openerBtn.setAttribute("aria-expanded", "false");
            if (returnFocus) openerBtn.focus({ preventScroll: true });
        }
        openerBtn = null;
    }

    function upgradeSwitchers() {
        document.querySelectorAll(".navbar-brand, .ksl-wordmark").forEach(function (el) {
            el.classList.add("notranslate");
        });
        document.querySelectorAll(".top-lang").forEach(function (wrap) {
            wrap.classList.add("notranslate");
            wrap.setAttribute("translate", "no");
            wrap.removeAttribute("role");
            wrap.removeAttribute("aria-label");
            wrap.innerHTML = '<button type="button" class="ksl-lang-btn" aria-haspopup="dialog" aria-expanded="false" aria-controls="kslLangMenu" aria-label="Choose language">' +
                ICON_GLOBE + '<span class="ksl-lang-btn-code"></span>' + ICON_CHEVRON + "</button>";
        });
    }

    document.addEventListener("click", function (event) {
        var btn = event.target.closest(".ksl-lang-btn");
        if (btn) {
            if (!menu.hidden && openerBtn === btn) closeMenu(false);
            else openMenu(btn);
            return;
        }
        if (menu && !menu.hidden && !menu.contains(event.target)) closeMenu(false);
    });

    window.addEventListener("resize", function () {
        if (menu && !menu.hidden) placeMenu();
    });
    window.addEventListener("scroll", function () {
        if (menu && !menu.hidden && !mobileMq.matches) closeMenu(false);
    }, { passive: true });

    upgradeSwitchers();
    buildMenu();

    var start = stored();
    if (!localMode(start)) {
        setGoogleCookie(start);
        loadGoogle();
        showLoading(start);
        waitForGoogle(start);
    } else if (hasGoogleCookie()) {
        setGoogleCookie("");
    }
    apply(current());
})();