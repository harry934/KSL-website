# Section branches

`main` is the live website. A change shows on the public site only after its branch is merged into `main`.

Each branch below is a copy of the site. Use it when you are changing that section, especially its pictures.

Before you edit:

1. Open the branch for that section.
2. Update it from `main` so you are not working on an old copy.
3. Replace only the files listed for that branch.
4. Commit, then merge the branch back into `main`.

| Branch | Section | Files to change |
| --- | --- | --- |
| `section/home` | Homepage, hero video, and logo intro | `index.html`, `img/ksl/hero.mp4`, `img/ksl/logo-intro.mp4`, `img/ksl/logo-intro-mobile.mp4` |
| `section/about` | Who We Are | `about.html` |
| `section/board` | Board portraits | `board.html`, `img/ksl/board/` |
| `section/organization` | Organization structure | `organization.html`, `data/organization.json` |
| `section/services` | Services | `service.html`, `data/services.json` |
| `section/products` | Products | `products.html` |
| `section/projects` | Projects | `project.html` |
| `section/news` | News and articles | `news.html`, `article.html`, `data/news.json` |
| `section/events` | Events | `event.html`, `data/events.json` |
| `section/gallery` | Gallery and videos | `videos.html`, `data/gallery.json`, `img/ksl/gallery/` |
| `section/sustainability` | Sustainability | `sustainability.html` |
| `section/csr` | Corporate social responsibility | `csr.html` |
| `section/careers` | Careers | `careers.html`, `data/careers.json` |
| `section/faq` | Frequently asked questions | `faq.html`, `data/faq.json` |
| `section/downloads` | Downloads | `downloads.html`, `data/downloads.json` |
| `section/contact` | Contact | `contact.html` |
| `section/clients` | Client logos on the homepage | `img/ksl/clients/` |
| `section/partners` | Partner logos on the homepage | `img/ksl/partners/` |
| `section/logo` | Navbar logo | `img/ksl/logo.png` |
| `section/shared-photos` | Yard photos used on more than one page | `img/ksl/yard.jpg`, `img/ksl/ferry.jpg`, `img/ksl/fishing.jpg`, `img/ksl/ambulance.jpg`, `img/ksl/mombasa.webp`, `img/ksl/kisumu.webp`, `img/ksl/linkspan.png` |

Shared photos have their own branch because replacing `img/ksl/yard.jpg` also changes Home, About, and Projects after the merge.
