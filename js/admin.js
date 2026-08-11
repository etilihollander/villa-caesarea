/* ===================================================================
   Villa Caesarea — admin panel logic (Supabase-backed)
   =================================================================== */

(function () {
  let data = null;
  let contentLang = "he";
  let selRange = { start: null, end: null };
  let admViewYear, admViewMonth;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  admViewYear = today.getFullYear();
  admViewMonth = today.getMonth();

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const HE_MONTHS = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
  const HE_DAYS = ["א","ב","ג","ד","ה","ו","ש"];

  /* ---------------- Auth ---------------- */
  const loginScreen = $("#loginScreen");
  const adminShell = $("#adminShell");

  async function showApp() {
    loginScreen.style.display = "none";
    adminShell.style.display = "flex";
    await refreshAllData();
  }

  function showLogin() {
    loginScreen.style.display = "flex";
    adminShell.style.display = "none";
  }

  $("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("#loginUser").value.trim();
    const pass = $("#loginPass").value;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    $("#loginError").textContent = "";
    try {
      await adminSignIn(email, pass);
      await showApp();
    } catch (err) {
      $("#loginError").textContent = "אימייל או סיסמה שגויים.";
      console.error(err);
    } finally {
      submitBtn.disabled = false;
    }
  });

  $("#logoutBtn").addEventListener("click", async () => {
    await adminSignOut();
    showLogin();
  });

  (async () => {
    const session = await getAdminSession();
    if (session) await showApp();
    else showLogin();
  })();

  /* ---------------- Sidebar nav ---------------- */
  function initSidebar() {
    $$(".admin-nav button").forEach((btn) => {
      btn.addEventListener("click", () => {
        $$(".admin-nav button").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        $$(".admin-panel").forEach((p) => p.classList.remove("active"));
        $(`#panel-${btn.dataset.panel}`).classList.add("active");
      });
    });
  }

  /* ---------------- Content panel ---------------- */
  function loadContentForm() {
    const c = data.content[contentLang];
    $("#f-villaName").value = c.villaName;
    $("#f-area").value = c.area;
    $("#f-tagline").value = c.tagline;
    $("#f-guests").value = c.guests;
    $("#f-bedrooms").value = c.bedrooms;
    $("#f-bathrooms").value = c.bathrooms;
    $("#f-introTitle").value = c.introTitle || "";
    $("#f-villaSubIntro").value = c.villaSubIntro || "";
    $("#f-villaAtmosphereTitle").value = c.villaAtmosphereTitle || "";
    $("#f-villaAtmosphere").value = c.villaAtmosphere || "";
    $("#f-villaLocationDetail").value = c.villaLocationDetail || "";
    $("#f-villaBedroomsDetail").value = c.villaBedroomsDetail || "";
    $("#f-villaGuestsDetail").value = c.villaGuestsDetail || "";
    $("#f-villaBathroomsDetail").value = c.villaBathroomsDetail || "";
    $("#f-villaPool").value = c.villaPool || "";
    $("#f-villaHeatedPool").value = c.villaHeatedPool || "";
    $("#f-villaOutdoorSpaces").value = c.villaOutdoorSpaces || "";
    $("#f-villaView").value = c.villaView || "";
    $("#f-availabilitySubtitle").value = c.availabilitySubtitle || "";
    $("#f-availabilityDesc").value = c.availabilityDesc || "";
    $("#f-availabilityCta").value = c.availabilityCta || "";
    $("#f-featurePersonalTitle").value = c.featurePersonalTitle || "";
    $("#f-featurePersonalDesc").value = c.featurePersonalDesc || "";
    $("#f-featureGuestsTitle").value = c.featureGuestsTitle || "";
    $("#f-featureGuestsDesc").value = c.featureGuestsDesc || "";
    $("#f-featureMinNightsTitle").value = c.featureMinNightsTitle || "";
    $("#f-featureMinNightsDesc").value = c.featureMinNightsDesc || "";
    renderAmenitiesEditor();
  }

  const amenityIconOptions = [
    { key: "pool", label: "בריכה" },
    { key: "chef", label: "מטבח" },
    { key: "dining", label: "אוכל" },
    { key: "games", label: "משחקים" },
    { key: "garden", label: "גינה" },
    { key: "tv", label: "טלוויזיה" },
    { key: "wifi", label: "אינטרנט" },
    { key: "ac", label: "מיזוג" },
    { key: "parking", label: "חניה" },
    { key: "beach", label: "חוף ים" },
    { key: "kids", label: "ילדים" },
    { key: "security", label: "אבטחה" }
  ];

  function normalizeAmenity(item) {
    if (typeof item === "string") return { text: item, icon: "" };
    return { text: item.text || "", icon: item.icon || "" };
  }

  function renderAmenitiesEditor() {
    const wrap = $("#amenitiesEditor");
    wrap.innerHTML = "";
    const list = data.content[contentLang].amenities || [];
    list.forEach((raw, idx) => {
      const item = normalizeAmenity(raw);
      const row = document.createElement("div");
      row.className = "amenity-row";
      const iconOpts = amenityIconOptions.map(
        (o) => `<option value="${o.key}"${o.key === item.icon ? " selected" : ""}>${o.label}</option>`
      ).join("");
      row.innerHTML = `<select data-icon-idx="${idx}"><option value="">ללא אייקון</option>${iconOpts}</select>
                        <input type="text" value="${escapeAttr(item.text)}" data-idx="${idx}">
                        <button type="button" data-remove="${idx}" title="הסרה">&times;</button>`;
      wrap.appendChild(row);
    });
    $$('[data-remove]', wrap).forEach((btn) => {
      btn.addEventListener("click", () => {
        list.splice(Number(btn.dataset.remove), 1);
        renderAmenitiesEditor();
      });
    });
  }

  function escapeAttr(s) {
    return String(s).replace(/"/g, "&quot;");
  }

  $("#addAmenityBtn").addEventListener("click", () => {
    data.content[contentLang].amenities.push({ text: "", icon: "" });
    renderAmenitiesEditor();
  });

  $$(".lang-tabs button[data-content-lang]").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$(".lang-tabs button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      contentLang = btn.dataset.contentLang;
      loadContentForm();
    });
  });

  $("#saveContentBtn").addEventListener("click", async () => {
    const c = data.content[contentLang];
    c.villaName = $("#f-villaName").value;
    c.area = $("#f-area").value;
    c.tagline = $("#f-tagline").value;
    c.guests = $("#f-guests").value;
    c.bedrooms = $("#f-bedrooms").value;
    c.bathrooms = $("#f-bathrooms").value;
    c.introTitle = $("#f-introTitle").value;
    c.villaSubIntro = $("#f-villaSubIntro").value;
    c.villaAtmosphereTitle = $("#f-villaAtmosphereTitle").value;
    c.villaAtmosphere = $("#f-villaAtmosphere").value;
    c.villaLocationDetail = $("#f-villaLocationDetail").value;
    c.villaBedroomsDetail = $("#f-villaBedroomsDetail").value;
    c.villaGuestsDetail = $("#f-villaGuestsDetail").value;
    c.villaBathroomsDetail = $("#f-villaBathroomsDetail").value;
    c.villaPool = $("#f-villaPool").value;
    c.villaHeatedPool = $("#f-villaHeatedPool").value;
    c.villaOutdoorSpaces = $("#f-villaOutdoorSpaces").value;
    c.villaView = $("#f-villaView").value;
    c.availabilitySubtitle = $("#f-availabilitySubtitle").value;
    c.availabilityDesc = $("#f-availabilityDesc").value;
    c.availabilityCta = $("#f-availabilityCta").value;
    c.featurePersonalTitle = $("#f-featurePersonalTitle").value;
    c.featurePersonalDesc = $("#f-featurePersonalDesc").value;
    c.featureGuestsTitle = $("#f-featureGuestsTitle").value;
    c.featureGuestsDesc = $("#f-featureGuestsDesc").value;
    c.featureMinNightsTitle = $("#f-featureMinNightsTitle").value;
    c.featureMinNightsDesc = $("#f-featureMinNightsDesc").value;
    c.amenities = $$("#amenitiesEditor .amenity-row").map((row) => {
      const text = row.querySelector("input").value;
      const icon = row.querySelector("select").value;
      return { text, icon };
    }).filter((a) => a.text.trim() !== "");
    const btn = $("#saveContentBtn");
    btn.disabled = true;
    try {
      await updateContent(contentLang, c);
      flashStatus("#contentSaveStatus");
    } catch (err) {
      alert("שגיאה בשמירה: " + err.message);
      console.error(err);
    } finally {
      btn.disabled = false;
    }
  });

  function flashStatus(sel) {
    const el = $(sel);
    el.classList.add("visible");
    setTimeout(() => el.classList.remove("visible"), 1800);
  }

  /* ---------------- Images panel ---------------- */
  const TAG_OPTIONS = [
    { value: "living", label: "סלון" },
    { value: "kitchen", label: "מטבח" },
    { value: "outdoor", label: "חוץ ובריכה" },
    { value: "bedroom", label: "חדרי שינה" },
    { value: "dining", label: "פינת אוכל" },
    { value: "bathroom", label: "חדרי רחצה" },
    { value: "entrance", label: "כניסה" },
    { value: "custom", label: "כללי" }
  ];

  function renderImages() {
    const grid = $("#imageGrid");
    grid.innerHTML = "";
    data.images.forEach((img) => {
      const tile = document.createElement("div");
      tile.className = "image-tile" + (img.isHidden ? " is-hidden" : "");
      tile.innerHTML = `
        <img src="${img.file}" alt="">
        ${img.isHero ? '<span class="hero-badge">בסלייד הבית</span>' : ""}
        ${img.isAbout ? '<span class="about-badge">תמונת הוילה</span>' : ""}
        ${img.isHidden ? '<span class="hidden-badge">מוסתרת</span>' : ""}
      `;
      const actions = document.createElement("div");
      actions.style.cssText = "position:absolute;top:6px;left:6px;display:flex;gap:4px;flex-wrap:wrap;max-width:calc(100% - 12px);align-items:center;";

      const tagSelect = document.createElement("select");
      tagSelect.style.cssText = "font-size:0.6rem;background:#fff;border:1px solid #ccc;padding:2px 4px;cursor:pointer;border-radius:3px;";
      TAG_OPTIONS.forEach((opt) => {
        const option = document.createElement("option");
        option.value = opt.value;
        option.textContent = opt.label;
        if (img.tag === opt.value) option.selected = true;
        tagSelect.appendChild(option);
      });
      tagSelect.addEventListener("change", async () => {
        tagSelect.disabled = true;
        try {
          await updateImageTag(img.id, tagSelect.value);
          await refreshAllData();
        } catch (err) {
          alert("שגיאה: " + err.message);
          tagSelect.disabled = false;
        }
      });
      actions.appendChild(tagSelect);

      const hideBtn = document.createElement("button");
      hideBtn.type = "button";
      hideBtn.textContent = img.isHidden ? "הצגה באתר" : "הסתרה מהאתר";
      hideBtn.style.cssText = "font-size:0.6rem;background:" + (img.isHidden ? "#e8d9c5" : "#fff") + ";border:none;padding:2px 6px;cursor:pointer;font-weight:" + (img.isHidden ? "600" : "400") + ";";
      hideBtn.addEventListener("click", async () => {
        hideBtn.disabled = true;
        try {
          await updateImageHidden(img.id, !img.isHidden);
          await refreshAllData();
        } catch (err) {
          alert("שגיאה: " + err.message);
          hideBtn.disabled = false;
        }
      });
      actions.appendChild(hideBtn);

      const heroBtn = document.createElement("button");
      heroBtn.type = "button";
      heroBtn.textContent = img.isHero ? "הסרה מסלייד הבית" : "הוספה לסלייד הבית";
      heroBtn.style.cssText = "font-size:0.6rem;background:#fff;border:none;padding:2px 6px;cursor:pointer;";
      heroBtn.addEventListener("click", async () => {
        heroBtn.disabled = true;
        try {
          await toggleHeroImage(img.id, !img.isHero);
          await refreshAllData();
        } catch (err) {
          alert("שגיאה: " + err.message);
        }
      });
      actions.appendChild(heroBtn);

      if (!img.isAbout) {
        const aboutBtn = document.createElement("button");
        aboutBtn.type = "button";
        aboutBtn.textContent = "הפוך לתמונת הוילה";
        aboutBtn.style.cssText = "font-size:0.6rem;background:#fff;border:none;padding:2px 6px;cursor:pointer;";
        aboutBtn.addEventListener("click", async () => {
          aboutBtn.disabled = true;
          try {
            await setAboutImage(img.id);
            await refreshAllData();
          } catch (err) {
            alert("שגיאה: " + err.message);
          }
        });
        actions.appendChild(aboutBtn);
      }

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.textContent = "✕";
      delBtn.style.cssText = "font-size:0.7rem;background:#fff;border:none;padding:2px 7px;cursor:pointer;color:#b96a55;";
      delBtn.addEventListener("click", async () => {
        if (data.images.length <= 1) {
          alert("חייבת להישאר לפחות תמונה אחת.");
          return;
        }
        if (confirm("להסיר את התמונה?")) {
          delBtn.disabled = true;
          try {
            await deleteImageRow(img.id, img.file);
            await refreshAllData();
          } catch (err) {
            alert("שגיאה במחיקה: " + err.message);
          }
        }
      });
      actions.appendChild(delBtn);
      tile.appendChild(actions);
      grid.appendChild(tile);
    });
  }

  $("#imageUploadInput").addEventListener("change", async (e) => {
    const files = Array.from(e.target.files || []);
    const dropLabel = $(".upload-drop");
    const originalText = dropLabel.firstChild.textContent;
    for (const file of files) {
      dropLabel.firstChild.textContent = `מעלה ${file.name}...`;
      try {
        await uploadImageFile(file);
      } catch (err) {
        alert("שגיאה בהעלאת תמונה: " + err.message);
        console.error(err);
      }
    }
    dropLabel.firstChild.textContent = originalText;
    e.target.value = "";
    await refreshAllData();
  });

  /* ---------------- Calendar panel ---------------- */
  function fmtMoneyCompact(n) {
    if (n >= 1000) return data.pricing.currencySymbol + Math.round(n / 1000) + "k";
    return data.pricing.currencySymbol + n;
  }

  function buildAdmMonth(year, month) {
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
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
          rowCells += `<td><div class="mini-day is-empty"></div></td>`;
          continue;
        }
        const dateObj = new Date(year, month, dayNum);
        const dateKey = fmtDateKey(dateObj);
        const info = getDayInfo(data, dateKey);
        const isPast = dateObj < today;
        let cls = "mini-day";
        if (isPast) cls += " is-past";
        if (info.closed) cls += " is-closed";
        else if (data.pricing.days[dateKey] && data.pricing.days[dateKey].price) cls += " is-custom-price";

        if (selRange.start && dateKey >= selRange.start && dateKey <= (selRange.end || selRange.start)) {
          cls += " is-checked";
        }

        // admin calendar allows editing past dates too, so actual bookings
        // can be recorded retroactively for the finance panel
        const priceHtml = `<span class="p">${info.closed ? "✕" : fmtMoneyCompact(info.price)}</span>`;
        rowCells += `<td><button type="button" class="${cls}" data-date="${dateKey}">${dayNum}${priceHtml}</button></td>`;
      }
      rows += `<tr>${rowCells}</tr>`;
    }
    const headCells = HE_DAYS.map((d) => `<th>${d}</th>`).join("");
    return `<div class="mini-cal">
      <div class="cal-head">${HE_MONTHS[month]} ${year}</div>
      <table><thead><tr>${headCells}</tr></thead><tbody>${rows}</tbody></table>
    </div>`;
  }

  function renderMiniCalendars() {
    const wrap = $("#miniCalendars");
    let html = "";
    for (let i = 0; i < 4; i++) {
      let m = admViewMonth + i;
      let y = admViewYear;
      while (m > 11) {
        m -= 12;
        y++;
      }
      html += buildAdmMonth(y, m);
    }
    wrap.innerHTML = html;
    $$(".mini-day[data-date]", wrap).forEach((btn) => {
      btn.addEventListener("click", () => onAdmDayClick(btn.dataset.date));
    });
    $("#admCalRangeLabel").textContent = `${HE_MONTHS[admViewMonth]} ${admViewYear}`;
  }

  function onAdmDayClick(dateKey) {
    if (!selRange.start || (selRange.start && selRange.end)) {
      selRange = { start: dateKey, end: null };
    } else if (dateKey < selRange.start) {
      selRange = { start: dateKey, end: selRange.start };
    } else {
      selRange.end = dateKey;
    }
    updateRangeSummary();
    renderMiniCalendars();
  }

  function updateRangeSummary() {
    const el = $("#rangeSummary");
    if (!selRange.start) {
      el.textContent = "לא נבחר טווח תאריכים. לחצו על תאריך התחלה ולאחר מכן תאריך סיום ביומן שלמטה.";
      return;
    }
    if (!selRange.end) {
      el.textContent = `תאריך התחלה נבחר: ${selRange.start}. לחצו על תאריך סיום (או על אותו תאריך שוב לבחירת יום בודד).`;
      return;
    }
    const nights = Math.round((new Date(selRange.end) - new Date(selRange.start)) / 86400000) + 1;
    el.innerHTML = `טווח נבחר: <strong>${selRange.start}</strong> עד <strong>${selRange.end}</strong> (${nights} ימים).`;
  }

  $("#admCalPrev").addEventListener("click", () => {
    admViewMonth--;
    if (admViewMonth < 0) {
      admViewMonth = 11;
      admViewYear--;
    }
    renderMiniCalendars();
  });
  $("#admCalNext").addEventListener("click", () => {
    admViewMonth++;
    if (admViewMonth > 11) {
      admViewMonth = 0;
      admViewYear++;
    }
    renderMiniCalendars();
  });

  async function withRangeAction(actionFn) {
    if (!selRange.start) return alert("בחרו קודם טווח תאריכים ביומן.");
    try {
      await actionFn();
      await refreshAllData();
    } catch (err) {
      alert("שגיאה: " + err.message);
      console.error(err);
    }
  }

  $("#setPriceBtn").addEventListener("click", () => {
    const price = Number($("#rangePriceInput").value);
    if (!price || price <= 0) return alert("הזינו מחיר תקין.");
    withRangeAction(() => setCalendarPriceRange(selRange.start, selRange.end, price)).then(() =>
      flashStatus("#contentSaveStatus")
    );
  });

  $("#closeRangeBtn").addEventListener("click", () => {
    withRangeAction(() => setCalendarClosedRange(selRange.start, selRange.end, true));
  });

  $("#reopenRangeBtn").addEventListener("click", () => {
    withRangeAction(() => setCalendarClosedRange(selRange.start, selRange.end, false));
  });

  $("#clearSelectionBtn").addEventListener("click", () => {
    selRange = { start: null, end: null };
    updateRangeSummary();
    renderMiniCalendars();
  });

  /* ---------------- Finance panel ---------------- */
  let finance = null;
  let actualByYear = {};
  let actualByMonth = {};
  let monthlyOpCostsCache = {};
  let opCostsYear = today.getFullYear();
  let opCostsMonth0 = today.getMonth();

  function fmtILS(n) {
    return "₪" + Math.round(n).toLocaleString("he-IL");
  }

  function sumCosts(list) {
    return (list || []).reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
  }

  function currentOpMonthKey() {
    return `${opCostsYear}-${String(opCostsMonth0 + 1).padStart(2, "0")}`;
  }

  async function ensureMonthLoaded(monthKey) {
    if (monthlyOpCostsCache[monthKey]) return;
    try {
      const costs = await loadMonthlyOperationalCosts(monthKey);
      monthlyOpCostsCache[monthKey] = (costs || finance.defaultOperationalCosts).map((c) => ({ ...c }));
    } catch (err) {
      console.error(err);
      monthlyOpCostsCache[monthKey] = finance.defaultOperationalCosts.map((c) => ({ ...c }));
    }
  }

  function renderCostEditor(wrapId, totalId, list) {
    const wrap = $(wrapId);
    wrap.innerHTML = "";
    list.forEach((item, idx) => {
      const row = document.createElement("div");
      row.className = "cost-row";
      row.innerHTML = `
        <input type="text" value="${escapeAttr(item.label)}" data-field="label" data-idx="${idx}">
        <input type="number" value="${item.amount}" data-field="amount" data-idx="${idx}">
        <button type="button" data-remove="${idx}" title="הסרה">&times;</button>
      `;
      wrap.appendChild(row);
    });
    $$('input[data-field="label"]', wrap).forEach((input) => {
      input.addEventListener("input", () => {
        list[Number(input.dataset.idx)].label = input.value;
      });
    });
    $$('input[data-field="amount"]', wrap).forEach((input) => {
      input.addEventListener("input", () => {
        list[Number(input.dataset.idx)].amount = Number(input.value) || 0;
        renderCostTotal(totalId, list);
        renderForecastTable();
        renderMonthSummaryTable();
      });
    });
    $$("[data-remove]", wrap).forEach((btn) => {
      btn.addEventListener("click", () => {
        list.splice(Number(btn.dataset.remove), 1);
        renderCostEditor(wrapId, totalId, list);
        renderCostTotal(totalId, list);
        renderForecastTable();
        renderMonthSummaryTable();
      });
    });
    renderCostTotal(totalId, list);
  }

  function renderCostTotal(totalId, list) {
    $(totalId).innerHTML = `<span>סה״כ</span><span>${fmtILS(sumCosts(list))}</span>`;
  }

  function parseNumberList(str) {
    return String(str || "")
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => n > 0);
  }

  function renderForecastTable() {
    const opTotal = sumCosts(monthlyOpCostsCache[currentOpMonthKey()]);
    const fixedTotal = sumCosts(finance.fixedCosts);
    const table = $("#forecastTable");
    const rows = [];
    finance.forecastPrices.forEach((price) => {
      finance.forecastNights.forEach((nights) => {
        const income = nights * price;
        const expense = nights * opTotal + fixedTotal;
        const remaining = income - expense;
        rows.push({ nights, price, income, expense, remaining });
      });
    });
    if (!rows.length) {
      table.innerHTML = `<tr class="empty-row"><td>הזינו מספרי לילות ומחירים כדי לראות תחזית.</td></tr>`;
      return;
    }
    const head = `<thead><tr>
      <th>לילות</th><th>מחיר ללילה</th><th>הכנסה שנתית</th><th>הוצאה שנתית</th><th>סה״כ נשאר</th>
    </tr></thead>`;
    const body = rows
      .map(
        (r) => `<tr>
          <td class="num">${r.nights}</td>
          <td class="num">${fmtILS(r.price)}</td>
          <td class="num">${fmtILS(r.income)}</td>
          <td class="num">${fmtILS(r.expense)}</td>
          <td class="num">${fmtILS(r.remaining)}</td>
        </tr>`
      )
      .join("");
    table.innerHTML = head + `<tbody>${body}</tbody>`;
  }

  function renderActualTable() {
    const table = $("#actualTable");
    const years = Object.keys(actualByYear).sort();
    if (!years.length) {
      table.innerHTML = `<tr class="empty-row"><td>אין עדיין תאריכים שסומנו כתפוסים ביומן.</td></tr>`;
      return;
    }
    const head = `<thead><tr><th>שנה</th><th>לילות שהוזמנו בפועל</th><th>הכנסה משוערת בפועל</th></tr></thead>`;
    const body = years
      .map((y) => `<tr><td>${y}</td><td class="num">${actualByYear[y].nights}</td><td class="num">${fmtILS(actualByYear[y].income)}</td></tr>`)
      .join("");
    table.innerHTML = head + `<tbody>${body}</tbody>`;
  }

  function renderMonthSummaryTable() {
    const monthKey = currentOpMonthKey();
    const actual = actualByMonth[monthKey] || { nights: 0, income: 0 };
    const opTotal = sumCosts(monthlyOpCostsCache[monthKey]);
    const fixedTotal = sumCosts(finance.fixedCosts);
    const expense = actual.nights * opTotal + fixedTotal / 12;
    const balance = actual.income - expense;
    const table = $("#monthSummaryTable");
    table.innerHTML = `<thead><tr>
        <th>לילות שנסגרו</th><th>הכנסה בפועל</th><th>הוצאה משוערת לחודש</th><th>מאזן</th>
      </tr></thead>
      <tbody><tr>
        <td class="num">${actual.nights}</td>
        <td class="num">${fmtILS(actual.income)}</td>
        <td class="num">${fmtILS(expense)}</td>
        <td class="num">${fmtILS(balance)}</td>
      </tr></tbody>`;
  }

  function renderOpCostsPanel() {
    const monthKey = currentOpMonthKey();
    $("#opCostsMonthLabel").textContent = `${HE_MONTHS[opCostsMonth0]} ${opCostsYear}`;
    renderCostEditor("#opCostsEditor", "#opCostsTotal", monthlyOpCostsCache[monthKey]);
    renderForecastTable();
    renderMonthSummaryTable();
  }

  $("#opCostsMonthPrev").addEventListener("click", async () => {
    opCostsMonth0--;
    if (opCostsMonth0 < 0) {
      opCostsMonth0 = 11;
      opCostsYear--;
    }
    await ensureMonthLoaded(currentOpMonthKey());
    renderOpCostsPanel();
  });
  $("#opCostsMonthNext").addEventListener("click", async () => {
    opCostsMonth0++;
    if (opCostsMonth0 > 11) {
      opCostsMonth0 = 0;
      opCostsYear++;
    }
    await ensureMonthLoaded(currentOpMonthKey());
    renderOpCostsPanel();
  });

  async function loadFinancePanel() {
    renderCostEditor("#fixedCostsEditor", "#fixedCostsTotal", finance.fixedCosts);
    $("#forecastNightsInput").value = finance.forecastNights.join(", ");
    $("#forecastPricesInput").value = finance.forecastPrices.join(", ");

    $("#actualTable").innerHTML = `<tr class="empty-row"><td>טוען...</td></tr>`;
    try {
      const stats = await loadActualBookingStats(data.pricing.basePrice);
      actualByYear = stats.byYear;
      actualByMonth = stats.byMonth;
    } catch (err) {
      console.error(err);
      $("#actualTable").innerHTML = `<tr class="empty-row"><td>שגיאה בטעינת נתוני ההזמנות בפועל.</td></tr>`;
    }
    renderActualTable();

    opCostsYear = today.getFullYear();
    opCostsMonth0 = today.getMonth();
    monthlyOpCostsCache = {};
    await ensureMonthLoaded(currentOpMonthKey());
    renderOpCostsPanel();
  }

  $("#addOpCostBtn").addEventListener("click", () => {
    const monthKey = currentOpMonthKey();
    monthlyOpCostsCache[monthKey].push({ label: "", amount: 0 });
    renderCostEditor("#opCostsEditor", "#opCostsTotal", monthlyOpCostsCache[monthKey]);
    renderForecastTable();
    renderMonthSummaryTable();
  });

  $("#addFixedCostBtn").addEventListener("click", () => {
    finance.fixedCosts.push({ label: "", amount: 0 });
    renderCostEditor("#fixedCostsEditor", "#fixedCostsTotal", finance.fixedCosts);
    renderForecastTable();
    renderMonthSummaryTable();
  });

  $("#forecastNightsInput").addEventListener("input", (e) => {
    finance.forecastNights = parseNumberList(e.target.value);
    renderForecastTable();
  });

  $("#forecastPricesInput").addEventListener("input", (e) => {
    finance.forecastPrices = parseNumberList(e.target.value);
    renderForecastTable();
  });

  $("#saveFinanceBtn").addEventListener("click", async () => {
    const btn = $("#saveFinanceBtn");
    btn.disabled = true;
    try {
      const monthKey = currentOpMonthKey();
      await Promise.all([updateFinanceSettings(finance), setMonthlyOperationalCosts(monthKey, monthlyOpCostsCache[monthKey])]);
      flashStatus("#financeSaveStatus");
    } catch (err) {
      alert("שגיאה בשמירה: " + err.message);
      console.error(err);
    } finally {
      btn.disabled = false;
    }
  });

  /* ---------------- Settings panel ---------------- */
  async function loadSettingsForm() {
    $("#f-basePrice").value = data.pricing.basePrice;
    $("#f-minNights").value = data.pricing.minNights;
    $("#f-contactEmail").value = data.contactEmail;
    const session = await getAdminSession();
    if (session && session.user) $("#f-adminEmail").value = session.user.email;
  }

  $("#saveSettingsBtn").addEventListener("click", async () => {
    const btn = $("#saveSettingsBtn");
    btn.disabled = true;
    try {
      await updateSettings({
        basePrice: Number($("#f-basePrice").value) || data.pricing.basePrice,
        minNights: Number($("#f-minNights").value) || data.pricing.minNights,
        contactEmail: $("#f-contactEmail").value || data.contactEmail
      });
      await refreshAllData();
      flashStatus("#settingsSaveStatus");
    } catch (err) {
      alert("שגיאה בשמירה: " + err.message);
    } finally {
      btn.disabled = false;
    }
  });

  $("#savePassBtn").addEventListener("click", async () => {
    const p1 = $("#f-newPass").value;
    const p2 = $("#f-newPass2").value;
    if (!p1 && !p2) return alert("הזינו סיסמה חדשה.");
    if (p1.length < 6) return alert("הסיסמה חייבת להכיל לפחות 6 תווים.");
    if (p1 !== p2) return alert("אימות הסיסמה אינו תואם.");
    const btn = $("#savePassBtn");
    btn.disabled = true;
    try {
      await changeAdminPassword(p1);
      $("#f-newPass").value = "";
      $("#f-newPass2").value = "";
      flashStatus("#passSaveStatus");
    } catch (err) {
      alert("שגיאה בעדכון הסיסמה: " + err.message);
    } finally {
      btn.disabled = false;
    }
  });

  /* ---------------- Init ---------------- */
  let sidebarInit = false;
  let unsubscribe = null;

  async function refreshAllData() {
    data = await loadData();
    if (!sidebarInit) {
      initSidebar();
      sidebarInit = true;
    }
    loadContentForm();
    renderImages();
    renderMiniCalendars();
    updateRangeSummary();
    finance = await loadFinanceSettings();
    await loadFinancePanel();
    await loadSettingsForm();

    if (!unsubscribe) {
      unsubscribe = subscribeToVillaChanges(() => {
        // avoid clobbering in-progress edits: just note that a change happened
        // elsewhere; the admin can switch panels to see the latest state.
      });
    }
  }
})();
