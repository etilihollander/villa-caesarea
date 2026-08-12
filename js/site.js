/* ===================================================================
   Villa Caesarea — public site logic
   =================================================================== */

(async function () {
  let data;
  try {
    data = await loadData();
  } catch (err) {
    console.error("Failed to load villa data from Supabase", err);
    document.body.innerHTML =
      '<p style="padding:4rem;font-family:sans-serif;text-align:center;">Sorry, we could not load the site right now. Please try again shortly.</p>';
    return;
  }

  let lang = localStorage.getItem("villaSiteLang") || (navigator.language || "en").slice(0, 2);
  if (lang !== "en" && lang !== "he") lang = "he";

  let selection = { checkin: null, checkout: null };
  let today = new Date();
  today.setHours(0, 0, 0, 0);
  let viewYear = today.getFullYear();
  let viewMonth = today.getMonth();
  let guestCount = 8;

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /* ---------------- i18n ---------------- */
  function t(key) {
    return data.content[lang][key];
  }

  function applyLangUI() {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "he" ? "rtl" : "ltr";
    $$(".lang-toggle button").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.lang === lang);
    });
  }

  function applyI18n() {
    document.title = t("metaTitle");
    $$("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      const val = t(key);
      if (typeof val === "string") el.textContent = val;
    });
    applyLangUI();
    renderHero();
    renderVillaAtmosphere();
    renderAmenities();
    renderGallery();
    renderCalendarMonths();
    updateSummary();
  }

  function setLang(newLang) {
    lang = newLang;
    localStorage.setItem("villaSiteLang", lang);
    applyI18n();
  }

  $$(".lang-toggle").forEach((toggle) => {
    toggle.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-lang]");
      if (btn) setLang(btn.dataset.lang);
    });
  });

  /* ---------------- Header scroll / mobile nav ---------------- */
  const header = $("#siteHeader");
  window.addEventListener("scroll", () => {
    header.classList.toggle("scrolled", window.scrollY > 40);
  });

  const navToggle = $("#navToggle");
  const mainNav = $("#mainNav");
  navToggle.addEventListener("click", () => mainNav.classList.toggle("open"));
  $$("#mainNav a").forEach((a) => a.addEventListener("click", () => mainNav.classList.remove("open")));

  /* ---------------- Hero slideshow ---------------- */
  let heroSlideIndex = 0;
  let heroAutoplayTimer = null;
  const heroSlidesEl = $("#heroSlides");
  const heroDotsEl = $("#heroDots");

  function renderHero() {
    const heroImages = data.images.filter((img) => img.isHero && !img.isHidden);
    const slides = heroImages.length ? heroImages : [data.images[0]];
    const villaName = data.content[lang].villaName;

    heroSlidesEl.innerHTML = slides
      .map((img, i) => `<img class="hero-slide${i === 0 ? " is-active" : ""}" src="${img.file}" alt="${villaName}">`)
      .join("");
    heroDotsEl.innerHTML = slides
      .map((_, i) => `<button type="button" class="hero-dot${i === 0 ? " is-active" : ""}" data-slide="${i}"></button>`)
      .join("");
    $$(".hero-dot", heroDotsEl).forEach((dot) => {
      dot.addEventListener("click", () => goToHeroSlide(Number(dot.dataset.slide)));
    });

    const multi = slides.length > 1;
    $("#heroPrev").hidden = !multi;
    $("#heroNext").hidden = !multi;
    heroDotsEl.hidden = !multi;

    heroSlideIndex = 0;
    clearInterval(heroAutoplayTimer);
    if (multi) heroAutoplayTimer = setInterval(() => goToHeroSlide(heroSlideIndex + 1), 6000);
  }

  function goToHeroSlide(i) {
    const slides = $$(".hero-slide", heroSlidesEl);
    heroSlideIndex = (i + slides.length) % slides.length;
    slides.forEach((el, idx) => el.classList.toggle("is-active", idx === heroSlideIndex));
    $$(".hero-dot", heroDotsEl).forEach((el, idx) => el.classList.toggle("is-active", idx === heroSlideIndex));
  }

  $("#heroPrev").addEventListener("click", () => goToHeroSlide(heroSlideIndex - 1));
  $("#heroNext").addEventListener("click", () => goToHeroSlide(heroSlideIndex + 1));

  /* ---------------- Villa section — atmosphere & about image ---------------- */
  function renderVillaAtmosphere() {
    const container = $("#villaAtmosphereText");
    if (!container) return;
    const text = t("villaAtmosphere") || "";
    container.innerHTML = "";
    text.split("\n\n").filter(function (s) { return s.trim(); }).forEach(function (para) {
      var p = document.createElement("p");
      p.textContent = para;
      container.appendChild(p);
    });
    var aboutImg = data.images.find(function (img) { return img.isAbout; }) || data.images[1] || data.images[0];
    if (aboutImg) $("#aboutImage").src = aboutImg.file;
  }

  /* ---------------- Gallery (category-based) ---------------- */
  const GALLERY_CAT_ORDER = ["living", "kitchen", "outdoor", "bedroom", "dining", "bathroom"];
  const GALLERY_CAT_LABELS = {
    living:   { he: "הסלון",        en: "The Living Room" },
    kitchen:  { he: "המטבח",        en: "The Kitchen" },
    outdoor:  { he: "החוץ והבריכה", en: "Outdoors & Pool" },
    bedroom:  { he: "חדרי השינה",   en: "Bedrooms" },
    dining:   { he: "פינת אוכל",    en: "Dining Area" },
    bathroom: { he: "חדרי רחצה",    en: "Bathrooms" },
    general:  { he: "הוילה",        en: "The Villa" }
  };

  function tagToCategory(tag) {
    if (!tag) return "general";
    const t = tag.toLowerCase().trim();
    if (t.includes("living") || t.includes("salon") || t.includes("lounge")) return "living";
    if (t.includes("kitchen")) return "kitchen";
    if (t.includes("dining")) return "dining";
    if (t.includes("outdoor") || t.includes("pool") || t.includes("exterior") || t.includes("garden") || t.includes("patio")) return "outdoor";
    if (t.includes("bed") || t.includes("master")) return "bedroom";
    if (t.includes("bath")) return "bathroom";
    if (t.includes("entertainment") || t.includes("game") || t.includes("billiard")) return "living";
    if (t.includes("entrance") || t.includes("hallway") || t.includes("foyer")) return "bathroom";
    return "general";
  }

  function renderGallery() {
    const nav = $("#galleryNav");
    const container = $("#galleryCategories");
    nav.innerHTML = "";
    container.innerHTML = "";

    const categories = {};
    data.images.filter((img) => !img.isHidden).forEach((img) => {
      const cat = tagToCategory(img.tag);
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(img);
    });

    const orderedCats = [...GALLERY_CAT_ORDER, "general"].filter((cat) => categories[cat] && categories[cat].length > 0);
    if (orderedCats.length === 0) return;

    container.classList.toggle("single-category", orderedCats.length === 1);

    const allLabel = lang === "he" ? "הכל" : "All";
    const allBtn = document.createElement("button");
    allBtn.className = "gallery-nav-item active";
    allBtn.textContent = allLabel;
    allBtn.addEventListener("click", () => {
      $$(".gallery-nav-item", nav).forEach((b) => b.classList.remove("active"));
      allBtn.classList.add("active");
      $$(".gallery-category", container).forEach((el) => { el.style.display = ""; });
    });
    nav.appendChild(allBtn);

    orderedCats.forEach((cat) => {
      const btn = document.createElement("button");
      btn.className = "gallery-nav-item";
      btn.textContent = GALLERY_CAT_LABELS[cat][lang];
      btn.addEventListener("click", () => {
        $$(".gallery-nav-item", nav).forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const target = document.getElementById("gallery-cat-" + cat);
        if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      nav.appendChild(btn);
    });

    orderedCats.forEach((cat) => {
      const images = categories[cat];
      const section = document.createElement("div");
      section.className = "gallery-category";
      section.id = "gallery-cat-" + cat;

      const header = document.createElement("div");
      header.className = "gallery-category-header";
      header.innerHTML =
        '<h3 class="gallery-category-title">' + GALLERY_CAT_LABELS[cat][lang] + "</h3>" +
        '<div class="gallery-category-divider"><span class="diamond"></span></div>';
      section.appendChild(header);

      const grid = document.createElement("div");
      grid.className = "gallery-category-images";
      images.forEach((img, i) => {
        const fig = document.createElement("figure");
        fig.innerHTML = '<img src="' + img.file + '" alt="' + GALLERY_CAT_LABELS[cat][lang] + '" loading="lazy">';
        fig.addEventListener("click", () => openLightbox(cat, i));
        grid.appendChild(fig);
      });
      section.appendChild(grid);
      container.appendChild(section);
    });
  }

  /* ---------------- Lightbox ---------------- */
  let lightboxCat = null;
  let lightboxIndex = 0;
  let lightboxImages = [];
  const lightbox = $("#lightbox");
  const lightboxImg = $("#lightboxImg");
  const lightboxCategoryEl = $("#lightboxCategory");
  const lightboxCounterEl = $("#lightboxCounter");

  function openLightbox(cat, i) {
    lightboxCat = cat;
    lightboxImages = data.images.filter((img) => tagToCategory(img.tag) === cat);
    lightboxIndex = i;
    updateLightbox();
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    lightbox.hidden = true;
    document.body.style.overflow = "";
  }

  function updateLightbox() {
    if (!lightboxImages.length) return;
    lightboxImg.src = lightboxImages[lightboxIndex].file;
    if (lightboxCategoryEl) lightboxCategoryEl.textContent = GALLERY_CAT_LABELS[lightboxCat][lang];
    if (lightboxCounterEl) lightboxCounterEl.textContent = (lightboxIndex + 1) + " / " + lightboxImages.length;
  }

  $("#lightboxClose").addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  $("#lightboxPrev").addEventListener("click", () => {
    lightboxIndex = (lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length;
    updateLightbox();
  });
  $("#lightboxNext").addEventListener("click", () => {
    lightboxIndex = (lightboxIndex + 1) % lightboxImages.length;
    updateLightbox();
  });
  document.addEventListener("keydown", (e) => {
    if (lightbox.hidden) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowRight") $("#lightboxNext").click();
    if (e.key === "ArrowLeft") $("#lightboxPrev").click();
  });
  let touchStartX = 0;
  lightbox.addEventListener("touchstart", (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });
  lightbox.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].screenX - touchStartX;
    if (Math.abs(dx) > 50) {
      if (dx > 0) $("#lightboxPrev").click();
      else $("#lightboxNext").click();
    }
  });

  /* ---------------- Amenities ---------------- */
  const amenityIcons = {
    pool: '<svg viewBox="0 0 32 32"><path d="M4 22c2 2 4 2 6 0s4-2 6 0 4 2 6 0 4-2 6 0"/><path d="M4 26c2 2 4 2 6 0s4-2 6 0 4 2 6 0 4-2 6 0"/><path d="M8 18V8a2 2 0 0 1 4 0v10"/><path d="M20 18v-4a2 2 0 0 1 4 0v4"/><path d="M12 12h8"/></svg>',
    chef: '<svg viewBox="0 0 32 32"><ellipse cx="16" cy="10" rx="8" ry="6"/><circle cx="10" cy="8" r="3"/><circle cx="22" cy="8" r="3"/><circle cx="16" cy="5" r="3"/><path d="M10 16v6a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-6"/><path d="M13 27h6"/></svg>',
    dining: '<svg viewBox="0 0 32 32"><circle cx="16" cy="17" r="8"/><circle cx="16" cy="17" r="5.5"/><path d="M6 7v6c0 1.5 1 3 3 3h0V7"/><path d="M8 7v6"/><path d="M9 16v10"/><path d="M23 7c0 3-1 5.5-1 8h2c0-2.5-1-5-1-8z"/><path d="M23 15v11"/></svg>',
    games: '<svg viewBox="0 0 32 32"><circle cx="10.5" cy="8.5" r="2"/><circle cx="17" cy="8.5" r="2"/><circle cx="13.75" cy="5" r="2"/><circle cx="13.75" cy="12" r="2"/><circle cx="20.5" cy="12" r="2"/><circle cx="7.25" cy="12" r="2"/><line x1="22" y1="4" x2="10" y2="28"/><path d="M6 26c0-1 1-2 2-2h4l-1 4H8a2 2 0 0 1-2-2z"/></svg>',
    garden: '<svg viewBox="0 0 32 32"><path d="M16 28V14"/><path d="M16 18c-5 0-9-4-9-9 4 0 9 4 9 9z"/><path d="M16 14c4 0 7-3 7-7-3 0-7 3-7 7z"/><path d="M10 28h12"/></svg>',
    tv: '<svg viewBox="0 0 32 32"><rect x="4" y="6" width="24" height="16" rx="1.5"/><path d="M10 26h12"/><path d="M16 22v4"/></svg>',
    wifi: '<svg viewBox="0 0 32 32"><circle cx="16" cy="26" r="1.5"/><path d="M10 22a8.5 8.5 0 0 1 12 0"/><path d="M6 18c5.5-5.5 14.5-5.5 20 0"/><path d="M2 14c7.7-7.7 20.3-7.7 28 0"/></svg>',
    ac: '<svg viewBox="0 0 32 32"><rect x="5" y="6" width="22" height="14" rx="2"/><path d="M9 24c0 2 2 4 4 2"/><path d="M16 24v4"/><path d="M23 24c0 2-2 4-4 2"/><path d="M8 16h16"/></svg>',
    parking: '<svg viewBox="0 0 32 32"><rect x="6" y="22" width="20" height="5" rx="1.5"/><path d="M9 22v-8l2-5h10l2 5v8"/><circle cx="10.5" cy="24.5" r="1.5"/><circle cx="21.5" cy="24.5" r="1.5"/><path d="M12 14h8"/></svg>',
    beach: '<svg viewBox="0 0 32 32"><path d="M4 28c3-2 6-3 10-3s8 1 14 3"/><path d="M16 6v16"/><path d="M16 6c-4 3-7 8-8 14"/><path d="M16 6c4 3 7 8 8 14"/><circle cx="16" cy="5" r="1.5"/></svg>',
    kids: '<svg viewBox="0 0 32 32"><circle cx="16" cy="8" r="4"/><path d="M10 28v-6a6 6 0 0 1 12 0v6"/><path d="M6 18l4 4"/><path d="M26 18l-4 4"/></svg>',
    security: '<svg viewBox="0 0 32 32"><path d="M16 4L6 9v7c0 7 4.3 12.4 10 14 5.7-1.6 10-7 10-14V9z"/><path d="M12 16l3 3 5-6"/></svg>'
  };

  function renderAmenities() {
    const grid = $("#amenitiesGrid");
    grid.innerHTML = "";
    (t("amenities") || []).forEach((item) => {
      const text = typeof item === "string" ? item : item.text;
      const iconKey = typeof item === "string" ? "" : (item.icon || "");
      const div = document.createElement("div");
      div.className = "amenity";
      const iconHtml = amenityIcons[iconKey]
        ? `<span class="amenity-icon">${amenityIcons[iconKey]}</span>`
        : "";
      div.innerHTML = `${iconHtml}<span class="amenity-label">${text}</span>`;
      grid.appendChild(div);
    });
  }

  /* ---------------- Calendar ---------------- */
  function fmtMoney(n) {
    return data.pricing.currencySymbol + Math.round(n).toLocaleString(lang === "he" ? "he-IL" : "en-US");
  }
  function fmtDateDisplay(dateKey) {
    const d = new Date(dateKey + "T12:00:00");
    const locale = lang === "he" ? "he-IL" : "en-US";
    return d.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  }

  function fmtMoneyCompact(n) {
    if (n >= 1000) return data.pricing.currencySymbol + Math.round(n / 1000) + "k";
    return data.pricing.currencySymbol + n;
  }

  function buildMonthTable(year, month) {
    const monthNames = t("monthNames");
    const dayNames = t("dayNames");
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let cells = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);

    let rows = "";
    for (let r = 0; r < cells.length / 7; r++) {
      let rowCells = "";
      for (let c = 0; c < 7; c++) {
        const dayNum = cells[r * 7 + c];
        if (dayNum === null) {
          rowCells += `<td><div class="day-cell is-empty"></div></td>`;
          continue;
        }
        const dateObj = new Date(year, month, dayNum);
        const dateKey = fmtDateKey(dateObj);
        const info = getDayInfo(data, dateKey);
        const isPast = dateObj < today;
        const isToday = dateObj.getTime() === today.getTime();
        let cls = "day-cell";
        if (isPast) cls += " is-past";
        else if (info.closed) cls += " is-closed";
        else cls += " is-available";
        if (isToday) cls += " is-today";

        if (!isPast && selection.checkin && !selection.checkout && dateKey === selection.checkin) cls += " is-selected";
        if (selection.checkin && selection.checkout) {
          if (dateKey === selection.checkin || dateKey === selection.checkout) cls += " is-selected";
          else if (dateKey > selection.checkin && dateKey < selection.checkout) cls += " is-in-range";
        }

        const priceHtml = isPast || info.closed ? '<span class="price-tag muted">—</span>' : `<span class="price-tag">${fmtMoney(info.price)}</span>`;
        rowCells += `<td><button type="button" class="${cls}" data-date="${dateKey}" ${isPast || info.closed ? "disabled" : ""}>${dayNum}${priceHtml}</button></td>`;
      }
      rows += `<tr>${rowCells}</tr>`;
    }

    const headCells = dayNames.map((d) => `<th>${d}</th>`).join("");

    return `
      <div class="calendar-month">
        <table>
          <caption>${monthNames[month]} ${year}</caption>
          <thead><tr>${headCells}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  function renderCalendarMonths() {
    const wrap = $("#calendarMonths");
    wrap.innerHTML = buildMonthTable(viewYear, viewMonth) + buildMonthTable(
      viewMonth === 11 ? viewYear + 1 : viewYear,
      viewMonth === 11 ? 0 : viewMonth + 1
    );
    $$(".day-cell[data-date]:not([disabled])", wrap).forEach((btn) => {
      btn.addEventListener("click", () => onDayClick(btn.dataset.date));
    });

    $("#calPrev").disabled = viewYear === today.getFullYear() && viewMonth === today.getMonth();
  }

  function hasClosedBetween(startKey, endKey) {
    let cursor = new Date(startKey);
    const end = new Date(endKey);
    while (cursor < end) {
      const info = getDayInfo(data, fmtDateKey(cursor));
      if (info.closed) return true;
      cursor.setDate(cursor.getDate() + 1);
    }
    return false;
  }

  function onDayClick(dateKey) {
    if (!selection.checkin || (selection.checkin && selection.checkout)) {
      selection = { checkin: dateKey, checkout: null };
    } else if (dateKey <= selection.checkin) {
      selection = { checkin: dateKey, checkout: null };
    } else {
      if (hasClosedBetween(selection.checkin, dateKey)) {
        selection = { checkin: dateKey, checkout: null };
      } else {
        selection.checkout = dateKey;
      }
    }
    renderCalendarMonths();
    updateSummary();
  }

  function updateSummary() {
    $("#summaryCheckin").textContent = selection.checkin ? fmtDateDisplay(selection.checkin) : "—";
    $("#summaryCheckout").textContent = selection.checkout ? fmtDateDisplay(selection.checkout) : "—";

    const hint = $("#summaryHint");
    const totalEl = $("#summaryTotal");
    const nightsEl = $("#summaryNights");
    const stayTotalDiv = $("#stayTotal");
    const disclaimer = $(".stay-disclaimer");

    if (selection.checkin) $("#formCheckin").value = selection.checkin;
    if (selection.checkout) $("#formCheckout").value = selection.checkout;

    if (!selection.checkin || !selection.checkout) {
      stayTotalDiv.style.display = "none";
      hint.textContent = t("selectDatesPrompt");
      hint.style.display = "block";
      if (disclaimer) disclaimer.style.display = "none";
      return;
    }

    let cursor = new Date(selection.checkin);
    const end = new Date(selection.checkout);
    let total = 0;
    let nights = 0;
    while (cursor < end) {
      const info = getDayInfo(data, fmtDateKey(cursor));
      total += info.price;
      nights++;
      cursor.setDate(cursor.getDate() + 1);
    }

    nightsEl.textContent = `${nights} ${t("nightsUnit")}`;
    totalEl.textContent = fmtMoney(total);
    stayTotalDiv.style.display = "flex";
    if (disclaimer) disclaimer.style.display = "block";
    hint.style.display = "none";
  }

  $("#calPrev").addEventListener("click", () => {
    viewMonth--;
    if (viewMonth < 0) {
      viewMonth = 11;
      viewYear--;
    }
    renderCalendarMonths();
  });
  $("#calNext").addEventListener("click", () => {
    viewMonth++;
    if (viewMonth > 11) {
      viewMonth = 0;
      viewYear++;
    }
    renderCalendarMonths();
  });

  /* ---------------- Guest counter ---------------- */
  $("#guestMinus").addEventListener("click", () => {
    if (guestCount > 1) {
      guestCount--;
      $("#guestCount").textContent = guestCount;
      const gf = $('input[name="guests"]');
      if (gf) gf.value = guestCount;
    }
  });
  $("#guestPlus").addEventListener("click", () => {
    if (guestCount < 20) {
      guestCount++;
      $("#guestCount").textContent = guestCount;
      const gf = $('input[name="guests"]');
      if (gf) gf.value = guestCount;
    }
  });

  /* ---------------- Contact form ---------------- */
  const form = $("#contactForm");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const name = fd.get("name");
    const email = fd.get("email");
    const phone = fd.get("phone");
    const guests = fd.get("guests");
    const checkin = fd.get("checkin");
    const checkout = fd.get("checkout");
    const message = fd.get("message");

    const subject = encodeURIComponent(`${data.content[lang].villaName} — Enquiry from ${name}`);
    const bodyLines = [
      `Name: ${name}`,
      `Email: ${email}`,
      phone ? `Phone: ${phone}` : null,
      guests ? `Guests: ${guests}` : null,
      checkin ? `Check-in: ${checkin}` : null,
      checkout ? `Check-out: ${checkout}` : null,
      "",
      message || ""
    ].filter(Boolean);
    const body = encodeURIComponent(bodyLines.join("\n"));

    window.location.href = `mailto:${data.contactEmail}?subject=${subject}&body=${body}`;

    const note = $("#formNote");
    note.textContent = t("formSuccess");
    note.classList.add("visible");
  });

  /* ---------------- Init ---------------- */
  $("#year").textContent = new Date().getFullYear();

  applyI18n();

  // keep the public site live: when the admin changes content, pricing,
  // availability or images, refresh automatically without a page reload
  let refreshTimer = null;
  subscribeToVillaChanges(() => {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(async () => {
      try {
        data = await loadData();
        applyI18n();
      } catch (err) {
        console.error("Failed to refresh villa data", err);
      }
    }, 400);
  });
})();
