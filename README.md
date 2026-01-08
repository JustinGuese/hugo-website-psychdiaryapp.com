used ui frameworks

Primary UI Framework: Bootstrap 5.3.0
Bootstrap 5 is the main framework. Evidence:
Hugo module import: github.com/gohugoio/hugo-mod-bootstrap-scss/v5 in config/_default/module.toml
SCSS imports: Bootstrap SCSS is imported in themes/small-apps-hugo/assets/scss/templates/_bootstrap.scss
Bootstrap JavaScript: Custom Bootstrap JS bundle in themes/small-apps-hugo/assets/js/bootstrap.js (includes Collapse, Dropdown, Modal, ScrollSpy, Tab)
Bootstrap classes: The index.html uses Bootstrap classes like:
Grid: container, row, col-lg-6, col-md-4
Components: btn, btn-primary, accordion, badge
Utilities: mb-3, text-center, fw-bold, bg-light, shadow-lg
Data attributes: data-bs-toggle, data-bs-target (Bootstrap 5 syntax)
Additional Libraries:
Swiper.js (v8.0.7) — Carousels/sliders (testimonials, about page)
AOS (Animate On Scroll) — Scroll animations (data-aos attributes)
Font Awesome 6 — Icons (fa-solid, fa-rocket, etc.)
So the template is built on Bootstrap 5.3.0 as the primary framework, with Swiper, AOS, and Font Awesome for additional functionality.