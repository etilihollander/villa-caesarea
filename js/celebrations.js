/* ===================================================================
   Villa Gefen — "אירועים חגיגיים בווילה" / Celebrations page

   Every word and every photo on this page comes from the
   celebrations_content document in Supabase (see loadCelebrations in
   js/data.js) — nothing editable is written into the markup. The shared
   chrome (nav labels, footer, contact details) still comes from
   site_content, exactly like the rest of the site.
   =================================================================== */

(async function () {
  let site, cel;
  try {
    [site, cel] = await Promise.all([loadData(), loadCelebrations()]);
  } catch (err) {
    console.error("Failed to load celebrations content from Supabase", err);
    // Replace only the page body, so the header, nav and footer survive and the
    // visitor still has a way back to the site. The language choice lives in
    // localStorage, so we can honour it before any content has loaded.
    const fallbackLang = localStorage.getItem("villaSiteLang") === "en" ? "en" : "he";
    const main = document.getElementById("mainContent");
    if (main) {
      main.textContent = "";
      const box = document.createElement("div");
      box.className = "cel-load-error";
      const msg = document.createElement("p");
      msg.textContent =
        fallbackLang === "he"
          ? "לא הצלחנו לטעון את תוכן העמוד כרגע. אנא נסו שוב בעוד רגע."
          : "We could not load this page right now. Please try again shortly.";
      const back = document.createElement("a");
      back.className = "btn";
      back.href = "index.html";
      back.textContent = fallbackLang === "he" ? "חזרה לעמוד הבית" : "Back to the home page";
      box.appendChild(msg);
      box.appendChild(back);
      main.appendChild(box);
    }
    return;
  }

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /* ---------------- Language ---------------- */
  // ?lang=he / ?lang=en lets each language be linked to directly (hreflang),
  // otherwise we follow the choice the visitor already made on the site.
  const urlLang = new URLSearchParams(location.search).get("lang");
  let lang = urlLang || localStorage.getItem("villaSiteLang") || (navigator.language || "he").slice(0, 2);
  if (lang !== "en" && lang !== "he") lang = "he";
  if (urlLang === "he" || urlLang === "en") localStorage.setItem("villaSiteLang", lang);

  function t(key) {
    return site.content[lang][key];
  }

  function setLang(newLang) {
    lang = newLang;
    localStorage.setItem("villaSiteLang", lang);
    render();
  }

  $$(".lang-toggle").forEach((toggle) => {
    toggle.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-lang]");
      if (btn) setLang(btn.dataset.lang);
    });
  });

  /* ---------------- Icons for the "Why Villa Gefen" cards ---------------- */
  const CELEBRATION_ICONS = {
    pool: '<svg viewBox="0 0 32 32"><path d="M4 22c2 2 4 2 6 0s4-2 6 0 4 2 6 0 4-2 6 0"/><path d="M4 26c2 2 4 2 6 0s4-2 6 0 4 2 6 0 4-2 6 0"/><path d="M8 18V8a2 2 0 0 1 4 0v10"/><path d="M20 18v-4a2 2 0 0 1 4 0v4"/><path d="M12 12h8"/></svg>',
    suite: '<svg viewBox="0 0 32 32"><path d="M3 25V9"/><path d="M29 25v-8a3 3 0 0 0-3-3H10v11"/><path d="M3 19h26"/><circle cx="7.5" cy="12.5" r="2.5"/></svg>',
    garden: '<svg viewBox="0 0 32 32"><path d="M16 28V14"/><path d="M16 18c-5 0-9-4-9-9 4 0 9 4 9 9z"/><path d="M16 14c4 0 7-3 7-7-3 0-7 3-7 7z"/><path d="M10 28h12"/></svg>',
    privacy: '<svg viewBox="0 0 32 32"><path d="M16 4L6 9v7c0 7 4.3 12.4 10 14 5.7-1.6 10-7 10-14V9z"/><path d="M12 16l3 3 5-6"/></svg>',
    chef: '<svg viewBox="0 0 32 32"><ellipse cx="16" cy="10" rx="8" ry="6"/><circle cx="10" cy="8" r="3"/><circle cx="22" cy="8" r="3"/><circle cx="16" cy="5" r="3"/><path d="M10 16v6a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-6"/><path d="M13 27h6"/></svg>',
    view: '<svg viewBox="0 0 32 32"><path d="M2 26l9-18 6.5 10.5L22 13l8 13z"/><circle cx="23" cy="7" r="3"/></svg>',
    dining: '<svg viewBox="0 0 32 32"><circle cx="16" cy="17" r="8"/><circle cx="16" cy="17" r="5.5"/><path d="M6 7v6c0 1.5 1 3 3 3h0V7"/><path d="M8 7v6"/><path d="M9 16v10"/><path d="M23 7c0 3-1 5.5-1 8h2c0-2.5-1-5-1-8z"/><path d="M23 15v11"/></svg>',
    games: '<svg viewBox="0 0 32 32"><circle cx="10.5" cy="8.5" r="2"/><circle cx="17" cy="8.5" r="2"/><circle cx="13.75" cy="5" r="2"/><circle cx="13.75" cy="12" r="2"/><circle cx="20.5" cy="12" r="2"/><circle cx="7.25" cy="12" r="2"/><line x1="22" y1="4" x2="10" y2="28"/><path d="M6 26c0-1 1-2 2-2h4l-1 4H8a2 2 0 0 1-2-2z"/></svg>',
    kids: '<svg viewBox="0 0 32 32"><circle cx="16" cy="8" r="4"/><path d="M10 28v-6a6 6 0 0 1 12 0v6"/><path d="M6 18l4 4"/><path d="M26 18l-4 4"/></svg>',
    parking: '<svg viewBox="0 0 32 32"><rect x="6" y="22" width="20" height="5" rx="1.5"/><path d="M9 22v-8l2-5h10l2 5v8"/><circle cx="10.5" cy="24.5" r="1.5"/><circle cx="21.5" cy="24.5" r="1.5"/><path d="M12 14h8"/></svg>',
    beach: '<svg viewBox="0 0 32 32"><path d="M4 28c3-2 6-3 10-3s8 1 14 3"/><path d="M16 6v16"/><path d="M16 6c-4 3-7 8-8 14"/><path d="M16 6c4 3 7 8 8 14"/><circle cx="16" cy="5" r="1.5"/></svg>',
    music: '<svg viewBox="0 0 32 32"><path d="M12 24V7l14-3v17"/><circle cx="8" cy="24" r="4"/><circle cx="22" cy="21" r="4"/></svg>',
    toast: '<svg viewBox="0 0 32 32"><path d="M9 4h14l-2 9a5 5 0 0 1-10 0z"/><path d="M16 18v8"/><path d="M11 28h10"/></svg>',
    ac: '<svg viewBox="0 0 32 32"><rect x="5" y="6" width="22" height="14" rx="2"/><path d="M9 24c0 2 2 4 4 2"/><path d="M16 24v4"/><path d="M23 24c0 2-2 4-4 2"/><path d="M8 16h16"/></svg>',
    wifi: '<svg viewBox="0 0 32 32"><circle cx="16" cy="26" r="1.5"/><path d="M10 22a8.5 8.5 0 0 1 12 0"/><path d="M6 18c5.5-5.5 14.5-5.5 20 0"/><path d="M2 14c7.7-7.7 20.3-7.7 28 0"/></svg>'
  };

  /* ---------------- Small helpers ---------------- */
  function setText(sel, value) {
    const el = $(sel);
    if (!el) return;
    const text = value || "";
    el.textContent = text;
    el.hidden = text === "";
  }

  function paragraphs(container, text) {
    container.innerHTML = "";
    String(text || "")
      .split("\n\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((para) => {
        const p = document.createElement("p");
        p.textContent = para;
        container.appendChild(p);
      });
  }

  function imageAlt(img, fallback) {
    return (img && img.alt && img.alt[lang]) || fallback || "";
  }

  // all inline SVGs on this site are decorative — hide them from screen readers
  function hideDecorativeSvgs() {
    $$("svg:not([aria-hidden])").forEach((s) => {
      s.setAttribute("aria-hidden", "true");
      s.setAttribute("focusable", "false");
    });
  }

  /* ---------------- Page chrome ---------------- */
  function applyChrome() {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "he" ? "rtl" : "ltr";

    document.title = cel.seo[lang].title || document.title;
    const metaDesc = $('meta[name="description"]');
    if (metaDesc && cel.seo[lang].description) metaDesc.content = cel.seo[lang].description;
    const ogTitle = $('meta[property="og:title"]');
    if (ogTitle && cel.seo[lang].title) ogTitle.content = cel.seo[lang].title;
    const ogDesc = $('meta[property="og:description"]');
    if (ogDesc && cel.seo[lang].description) ogDesc.content = cel.seo[lang].description;
    const ogLocale = $('meta[property="og:locale"]');
    if (ogLocale) ogLocale.content = lang === "he" ? "he_IL" : "en_US";

    $$("[data-i18n]").forEach((el) => {
      const val = t(el.getAttribute("data-i18n"));
      if (typeof val === "string") el.textContent = val;
    });

    const navLink = $("#navCelebrations");
    if (navLink) navLink.textContent = cel.nav[lang] || navLink.textContent;

    $$(".lang-toggle button").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.lang === lang);
      btn.setAttribute("aria-pressed", btn.dataset.lang === lang ? "true" : "false");
    });

    const navToggleBtn = $("#navToggle");
    if (navToggleBtn) {
      navToggleBtn.setAttribute("aria-label", lang === "he" ? "פתיחת תפריט ניווט" : "Open navigation menu");
    }
    localizeA11yWidget();
  }

  // the widget markup is injected by js/legal.js (shared with the legal pages),
  // which labels it in Hebrew — relabel it for the active language
  function localizeA11yWidget() {
    const labels = {
      "large-text": "a11yLargeText",
      contrast: "a11yContrast",
      links: "a11yLinks",
      readable: "a11yReadableFont",
      "no-motion": "a11yStopMotion"
    };
    Object.keys(labels).forEach((mode) => {
      const btn = $('.a11y-panel button[data-a11y="' + mode + '"]');
      const val = t(labels[mode]);
      if (btn && typeof val === "string") btn.textContent = val;
    });
    const title = $(".a11y-panel-title");
    if (title && typeof t("a11yMenuTitle") === "string") title.textContent = t("a11yMenuTitle");
    const reset = $("#a11yReset");
    if (reset && typeof t("a11yReset") === "string") reset.textContent = t("a11yReset");
    const statement = $('.a11y-panel a[href="accessibility.html"]');
    if (statement && typeof t("a11yStatementLink") === "string") statement.textContent = t("a11yStatementLink");
    const toggle = $("#a11yToggle");
    const widget = $("#a11yWidget");
    if (toggle) {
      const min = widget && widget.classList.contains("is-min");
      toggle.setAttribute(
        "aria-label",
        min
          ? lang === "he" ? "הצגת כפתור הנגישות" : "Show accessibility button"
          : lang === "he" ? "תפריט נגישות" : "Accessibility menu"
      );
    }
    const hide = $("#a11yHide");
    if (hide) hide.setAttribute("aria-label", lang === "he" ? "מזעור כפתור הנגישות" : "Minimize accessibility button");
  }

  /* ---------------- Hero ---------------- */
  function renderHero() {
    const heroImg = $("#celHeroImage");
    // falls back to the villa's own home-page hero photo until the owner
    // uploads a dedicated one — never a stock or generated image
    const fallback = site.images.find((img) => img.isHero && !img.isHidden) || site.images[0];
    const url = cel.hero.image.url || (fallback && fallback.file) || "";
    if (url) {
      heroImg.src = url;
      heroImg.alt = imageAlt(cel.hero.image, cel.hero[lang].title || site.content[lang].villaName);
      heroImg.hidden = false;
    } else {
      heroImg.removeAttribute("src");
      heroImg.hidden = true;
    }
    setText("#celHeroEyebrow", cel.hero[lang].eyebrow);
    setText("#celHeroTitle", cel.hero[lang].title);
    setText("#celHeroIntro", cel.hero[lang].intro);
  }

  /* ---------------- "Not an event hall" notice ---------------- */
  function renderNotice() {
    setText("#celNotice", cel.notice[lang]);
    const wrap = $(".cel-notice-wrap");
    if (wrap) wrap.hidden = !cel.notice[lang];
  }

  /* ---------------- Celebration categories ---------------- */
  function renderCategories() {
    setText("#celCatEyebrow", cel.categoriesHead[lang].eyebrow);
    setText("#celCatTitle", cel.categoriesHead[lang].title);
    setText("#celCatDesc", cel.categoriesHead[lang].desc);

    const wrap = $("#celCategories");
    wrap.innerHTML = "";

    const visible = cel.categories.filter((cat) => !cat.hidden);
    const section = $("#celebrationTypes");
    section.hidden = visible.length === 0;
    if (!visible.length) return;

    visible.forEach((cat, i) => {
      const title = cat[lang].title;
      const block = document.createElement("article");
      block.className = "cel-category" + (i % 2 === 1 ? " is-reversed" : "");
      block.id = "celebration-" + cat.id;

      const media = document.createElement("div");
      media.className = "cel-category-media";
      if (cat.image.url) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "cel-category-photo";
        btn.setAttribute("aria-label", title + (lang === "he" ? " — הצגה מוגדלת" : " — view larger"));
        const im = document.createElement("img");
        im.src = cat.image.url;
        im.alt = imageAlt(cat.image, title);
        im.loading = "lazy";
        btn.appendChild(im);
        btn.addEventListener("click", () => openLightbox(cat, 0));
        media.appendChild(btn);
      } else {
        // no photo yet — an ornamental frame rather than a stand-in photograph
        const ph = document.createElement("div");
        ph.className = "cel-photo-placeholder";
        ph.setAttribute("aria-hidden", "true");
        ph.innerHTML = '<span class="diamond"></span>';
        media.appendChild(ph);
      }

      const body = document.createElement("div");
      body.className = "cel-category-body";
      const h3 = document.createElement("h3");
      h3.className = "cel-category-title";
      h3.textContent = title;
      body.appendChild(h3);
      const divider = document.createElement("div");
      divider.className = "gallery-category-divider";
      divider.innerHTML = '<span class="diamond"></span>';
      body.appendChild(divider);
      const text = document.createElement("div");
      text.className = "cel-category-text";
      paragraphs(text, cat[lang].desc);
      body.appendChild(text);

      block.appendChild(media);
      block.appendChild(body);

      if (cat.gallery.length) {
        const gallery = document.createElement("div");
        gallery.className = "gallery-category-images cel-gallery";
        const offset = cat.image.url ? 1 : 0;
        cat.gallery.forEach((img, idx) => {
          const fig = document.createElement("figure");
          const im = document.createElement("img");
          im.src = img.url;
          im.alt = imageAlt(img, title + " " + (idx + 1));
          im.loading = "lazy";
          fig.appendChild(im);
          fig.tabIndex = 0;
          fig.setAttribute("role", "button");
          fig.setAttribute(
            "aria-label",
            title + " " + (idx + 1) + "/" + cat.gallery.length + (lang === "he" ? " — הצגה מוגדלת" : " — view larger")
          );
          fig.addEventListener("click", () => openLightbox(cat, idx + offset));
          fig.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openLightbox(cat, idx + offset);
            }
          });
          gallery.appendChild(fig);
        });
        block.appendChild(gallery);
      }

      wrap.appendChild(block);
    });
  }

  /* ---------------- Lightbox ---------------- */
  let lbImages = [];
  let lbIndex = 0;
  let lbLabel = "";
  let lbReturnFocus = null;
  const lightbox = $("#lightbox");

  function lightboxSet(cat) {
    const list = [];
    if (cat.image.url) list.push(cat.image);
    return list.concat(cat.gallery);
  }

  function openLightbox(cat, index) {
    lbImages = lightboxSet(cat);
    if (!lbImages.length) return;
    lbLabel = cat[lang].title;
    lbIndex = Math.max(0, Math.min(index, lbImages.length - 1));
    updateLightbox();
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
    lbReturnFocus = document.activeElement;
    $("#lightboxClose").focus();
  }

  function closeLightbox() {
    lightbox.hidden = true;
    document.body.style.overflow = "";
    if (lbReturnFocus && typeof lbReturnFocus.focus === "function") lbReturnFocus.focus();
    lbReturnFocus = null;
  }

  function updateLightbox() {
    const img = lbImages[lbIndex];
    if (!img) return;
    $("#lightboxImg").src = img.url;
    $("#lightboxImg").alt = imageAlt(img, lbLabel + " " + (lbIndex + 1) + "/" + lbImages.length);
    $("#lightboxCategory").textContent = lbLabel;
    $("#lightboxCounter").textContent = lbIndex + 1 + " / " + lbImages.length;
  }

  function stepLightbox(delta) {
    if (!lbImages.length) return;
    lbIndex = (lbIndex + delta + lbImages.length) % lbImages.length;
    updateLightbox();
  }

  $("#lightboxClose").addEventListener("click", closeLightbox);
  $("#lightboxPrev").addEventListener("click", () => stepLightbox(-1));
  $("#lightboxNext").addEventListener("click", () => stepLightbox(1));
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener("keydown", (e) => {
    if (lightbox.hidden) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowRight") stepLightbox(1);
    if (e.key === "ArrowLeft") stepLightbox(-1);
  });
  let touchStartX = 0;
  lightbox.addEventListener("touchstart", (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });
  lightbox.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].screenX - touchStartX;
    if (Math.abs(dx) > 50) stepLightbox(dx > 0 ? -1 : 1);
  });

  /* ---------------- Why Villa Gefen ---------------- */
  function renderWhy() {
    setText("#celWhyEyebrow", cel.why[lang].eyebrow);
    setText("#celWhyTitle", cel.why[lang].title);
    setText("#celWhyDesc", cel.why[lang].desc);

    const grid = $("#celWhyGrid");
    grid.innerHTML = "";
    const items = cel.why.items.filter((item) => item[lang].title || item[lang].desc);
    $("#celWhy").hidden = items.length === 0 && !cel.why[lang].title;

    items.forEach((item) => {
      const card = document.createElement("div");
      card.className = "cel-why-card";
      const icon = CELEBRATION_ICONS[item.icon];
      card.innerHTML = (icon ? '<span class="cel-why-icon">' + icon + "</span>" : "") + "<strong></strong><p></p>";
      card.querySelector("strong").textContent = item[lang].title;
      card.querySelector("p").textContent = item[lang].desc;
      grid.appendChild(card);
    });
  }

  /* ---------------- Contact CTA ---------------- */
  function whatsappNumber(phone) {
    let digits = String(phone || "").replace(/[^\d+]/g, "");
    if (digits.startsWith("+")) return digits.slice(1).replace(/\D/g, "");
    if (digits.startsWith("0")) return "972" + digits.slice(1).replace(/\D/g, "");
    return digits.replace(/\D/g, "");
  }

  const CHANNEL_ICONS = {
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.86 19.86 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
    email: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 6L2 7"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.33 4.95L2 22l5.3-1.39a9.86 9.86 0 0 0 4.74 1.21h.01c5.45 0 9.9-4.44 9.9-9.9 0-2.64-1.03-5.13-2.9-7A9.82 9.82 0 0 0 12.04 2zm0 1.8c2.16 0 4.19.84 5.72 2.37a8.04 8.04 0 0 1 2.37 5.73c0 4.46-3.63 8.09-8.1 8.09a8.1 8.1 0 0 1-4.12-1.13l-.3-.17-3.06.8.82-2.99-.19-.31a8.03 8.03 0 0 1-1.24-4.3c0-4.46 3.64-8.09 8.1-8.09zm-2.3 4.07c-.17 0-.45.07-.69.32-.24.25-.9.88-.9 2.15s.92 2.5 1.05 2.66c.13.17 1.8 2.74 4.36 3.74 2.13.84 2.56.67 3.02.63.46-.04 1.49-.61 1.7-1.2.21-.59.21-1.1.15-1.2-.06-.11-.24-.17-.49-.3-.25-.12-1.49-.73-1.72-.82-.23-.08-.4-.12-.56.13-.17.25-.65.81-.8.98-.14.17-.29.19-.54.06-.25-.12-1.06-.39-2.02-1.24-.75-.67-1.25-1.49-1.4-1.74-.14-.25-.01-.38.11-.5.11-.12.25-.3.37-.44.12-.15.16-.25.25-.42.08-.17.04-.31-.02-.44-.06-.12-.55-1.36-.76-1.86-.2-.49-.4-.42-.55-.43h-.47z"/></svg>'
  };

  function renderCta() {
    const c = cel.cta[lang];
    setText("#celCtaEyebrow", c.eyebrow);
    setText("#celCtaTitle", c.title);
    setText("#celCtaDesc", c.desc);
    setText("#celCtaNote", c.note);

    const actions = $("#celCtaActions");
    actions.innerHTML = "";

    const wa = whatsappNumber(site.contactPhone);
    if (wa && c.button) {
      const a = document.createElement("a");
      a.className = "btn btn-primary cel-cta-btn";
      a.href = "https://wa.me/" + wa + (c.whatsappMessage ? "?text=" + encodeURIComponent(c.whatsappMessage) : "");
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.innerHTML = CHANNEL_ICONS.whatsapp + "<span></span>";
      a.querySelector("span").textContent = c.button;
      actions.appendChild(a);
    }

    if (c.secondaryButton) {
      const a = document.createElement("a");
      a.className = "btn cel-cta-btn";
      a.href = "index.html#contact";
      a.textContent = c.secondaryButton;
      actions.appendChild(a);
    }

    const wrap = $("#celCtaChannels");
    wrap.innerHTML = "";
    const channels = [];
    if (site.contactPhone) {
      channels.push({
        href: "tel:" + site.contactPhone.replace(/[^+\d]/g, ""),
        label: lang === "he" ? "התקשרו אלינו" : "Call us",
        text: site.contactPhone,
        icon: CHANNEL_ICONS.phone
      });
    }
    if (site.contactEmail) {
      channels.push({
        href: "mailto:" + site.contactEmail,
        label: lang === "he" ? "שלחו לנו מייל" : "Email us",
        text: site.contactEmail,
        icon: CHANNEL_ICONS.email
      });
    }
    if (site.contactInstagram) {
      const handle = site.contactInstagram.replace(/^@/, "");
      channels.push({
        href: /^https?:\/\//i.test(site.contactInstagram) ? site.contactInstagram : "https://www.instagram.com/" + handle,
        external: true,
        label: lang === "he" ? "עקבו אחרינו באינסטגרם" : "Follow us on Instagram",
        text: lang === "he" ? "אינסטגרם" : "Instagram",
        icon: CHANNEL_ICONS.instagram
      });
    }
    channels.forEach((ch) => {
      const a = document.createElement("a");
      a.className = "contact-channel";
      a.href = ch.href;
      a.setAttribute("aria-label", ch.label);
      if (ch.external) {
        a.target = "_blank";
        a.rel = "noopener noreferrer";
      }
      a.innerHTML = ch.icon + '<span dir="auto"></span>';
      a.querySelector("span").textContent = ch.text;
      wrap.appendChild(a);
    });
  }

  /* ---------------- Header & mobile nav ---------------- */
  const header = $("#siteHeader");
  function syncHeader() {
    header.classList.toggle("scrolled", window.scrollY > 40);
  }
  window.addEventListener("scroll", syncHeader);

  const navToggle = $("#navToggle");
  const mainNav = $("#mainNav");
  navToggle.addEventListener("click", () => {
    const open = mainNav.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
  $$("#mainNav a").forEach((a) =>
    a.addEventListener("click", () => {
      mainNav.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    })
  );

  /* ---------------- Init ---------------- */
  function render() {
    applyChrome();
    renderHero();
    renderNotice();
    renderCategories();
    renderWhy();
    renderCta();
    hideDecorativeSvgs();
  }

  $("#year").textContent = new Date().getFullYear();
  syncHeader();
  render();

  // js/legal.js rewrites the widget's aria-label in Hebrew when it is
  // minimised/restored — put the active language back afterwards
  const a11yWidget = $("#a11yWidget");
  if (a11yWidget) a11yWidget.addEventListener("click", () => setTimeout(localizeA11yWidget, 0));

  // keep the page live when the owner saves a change in the admin panel
  let refreshTimer = null;
  subscribeToVillaChanges(() => {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(async () => {
      try {
        [site, cel] = await Promise.all([loadData(), loadCelebrations()]);
        render();
      } catch (err) {
        console.error("Failed to refresh celebrations content", err);
      }
    }, 400);
  });
})();
