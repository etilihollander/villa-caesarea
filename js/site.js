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
    renderAboutImage();
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
    const heroImages = data.images.filter((img) => img.isHero);
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

  /* ---------------- About-section image ---------------- */
  function renderAboutImage() {
    const aboutImg = data.images.find((img) => img.isAbout) || data.images[1] || data.images[0];
    if (aboutImg) $("#aboutImage").src = aboutImg.file;
  }

  /* ---------------- Gallery ---------------- */
  function renderGallery() {
    const grid = $("#galleryGrid");
    grid.innerHTML = "";
    const images = data.images;
    images.forEach((img, i) => {
      const fig = document.createElement("figure");
      if (i === 0 || i === 5) fig.classList.add("wide");
      fig.innerHTML = `<img src="${img.file}" alt="${data.content[lang].villaName}" loading="lazy">`;
      fig.addEventListener("click", () => openLightbox(i));
      grid.appendChild(fig);
    });
  }

  let lightboxIndex = 0;
  const lightbox = $("#lightbox");
  const lightboxImg = $("#lightboxImg");

  function openLightbox(i) {
    lightboxIndex = i;
    updateLightbox();
    lightbox.hidden = false;
  }
  function updateLightbox() {
    lightboxImg.src = data.images[lightboxIndex].file;
  }
  $("#lightboxClose").addEventListener("click", () => (lightbox.hidden = true));
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) lightbox.hidden = true;
  });
  $("#lightboxPrev").addEventListener("click", () => {
    lightboxIndex = (lightboxIndex - 1 + data.images.length) % data.images.length;
    updateLightbox();
  });
  $("#lightboxNext").addEventListener("click", () => {
    lightboxIndex = (lightboxIndex + 1) % data.images.length;
    updateLightbox();
  });
  document.addEventListener("keydown", (e) => {
    if (lightbox.hidden) return;
    if (e.key === "Escape") lightbox.hidden = true;
    if (e.key === "ArrowRight") $("#lightboxNext").click();
    if (e.key === "ArrowLeft") $("#lightboxPrev").click();
  });

  /* ---------------- Amenities ---------------- */
  function renderAmenities() {
    const grid = $("#amenitiesGrid");
    grid.innerHTML = "";
    (t("amenities") || []).forEach((label) => {
      const div = document.createElement("div");
      div.className = "amenity";
      div.innerHTML = `<span class="dot"></span><span class="label">${label}</span>`;
      grid.appendChild(div);
    });
  }

  /* ---------------- Calendar ---------------- */
  function fmtMoney(n) {
    return data.pricing.currencySymbol + Math.round(n).toLocaleString(lang === "he" ? "he-IL" : "en-US");
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

        const priceHtml = !isPast && !info.closed ? `<span class="price-tag">${fmtMoneyCompact(info.price)}</span>` : "";
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
    const monthNames = t("monthNames");
    $("#calMonthLabel").textContent = `${monthNames[viewMonth]} ${viewYear}`;

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
    $("#summaryCheckin").textContent = selection.checkin || "—";
    $("#summaryCheckout").textContent = selection.checkout || "—";
    $("#summaryMinNights").textContent = `${data.pricing.minNights} ${t("nightsUnit")}`;

    const hint = $("#summaryHint");
    const totalEl = $("#summaryTotal");

    if (selection.checkin) $("#formCheckin").value = selection.checkin;
    if (selection.checkout) $("#formCheckout").value = selection.checkout;

    if (!selection.checkin || !selection.checkout) {
      totalEl.textContent = "—";
      hint.textContent = t("selectDatesPrompt");
      hint.style.display = "block";
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

    totalEl.textContent = fmtMoney(total) + " " + t("perNight").replace("/ ", "");
    if (nights < data.pricing.minNights) {
      hint.textContent = `${t("minNightsLabel")}: ${data.pricing.minNights} ${t("nightsUnit")}`;
      hint.style.display = "block";
    } else {
      hint.textContent = `${nights} ${t("nightsUnit")}`;
      hint.style.display = "block";
    }
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
