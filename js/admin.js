/* ===================================================================
   Villa Caesarea — admin panel logic
   =================================================================== */

(function () {
  let data = loadData();
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
  const HE_DAYS = ["א'","ב'","ג'","ד'","ה'","ו'","ש'"];

  /* ---------------- Auth ---------------- */
  const loginScreen = $("#loginScreen");
  const adminShell = $("#adminShell");

  function isLoggedIn() {
    return sessionStorage.getItem("villaAdminLoggedIn") === "1";
  }

  function showApp() {
    loginScreen.style.display = "none";
    adminShell.style.display = "flex";
    initAdminUI();
  }

  function showLogin() {
    loginScreen.style.display = "flex";
    adminShell.style.display = "none";
  }

  $("#loginForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const user = $("#loginUser").value.trim();
    const pass = $("#loginPass").value;
    if (user === data.admin.username && simpleHash(pass) === data.admin.passwordHash) {
      sessionStorage.setItem("villaAdminLoggedIn", "1");
      $("#loginError").textContent = "";
      showApp();
    } else {
      $("#loginError").textContent = "שם משתמש או סיסמה שגויים.";
    }
  });

  $("#logoutBtn").addEventListener("click", () => {
    sessionStorage.removeItem("villaAdminLoggedIn");
    showLogin();
  });

  if (isLoggedIn()) showApp();
  else showLogin();

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
    $("#f-introTitle").value = c.introTitle;
    $("#f-introText").value = c.introText;
    renderAmenitiesEditor();
  }

  function renderAmenitiesEditor() {
    const wrap = $("#amenitiesEditor");
    wrap.innerHTML = "";
    const list = data.content[contentLang].amenities || [];
    list.forEach((item, idx) => {
      const row = document.createElement("div");
      row.className = "amenity-row";
      row.innerHTML = `<input type="text" value="${escapeAttr(item)}" data-idx="${idx}">
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
    data.content[contentLang].amenities.push("");
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

  $("#saveContentBtn").addEventListener("click", () => {
    const c = data.content[contentLang];
    c.villaName = $("#f-villaName").value;
    c.area = $("#f-area").value;
    c.tagline = $("#f-tagline").value;
    c.guests = $("#f-guests").value;
    c.bedrooms = $("#f-bedrooms").value;
    c.bathrooms = $("#f-bathrooms").value;
    c.introTitle = $("#f-introTitle").value;
    c.introText = $("#f-introText").value;
    c.amenities = $$("#amenitiesEditor input").map((i) => i.value).filter((v) => v.trim() !== "");
    saveData(data);
    flashStatus("#contentSaveStatus");
  });

  function flashStatus(sel) {
    const el = $(sel);
    el.classList.add("visible");
    setTimeout(() => el.classList.remove("visible"), 1800);
  }

  /* ---------------- Images panel ---------------- */
  function renderImages() {
    const grid = $("#imageGrid");
    grid.innerHTML = "";
    data.images.forEach((img, idx) => {
      const tile = document.createElement("div");
      tile.className = "image-tile";
      tile.innerHTML = `
        <img src="${img.file}" alt="">
        ${idx === 0 ? '<span class="hero-badge">הירו</span>' : ""}
        <span class="tag-badge">${img.tag || ""}</span>
      `;
      const actions = document.createElement("div");
      actions.style.cssText = "position:absolute;top:6px;left:6px;display:flex;gap:4px;";
      if (idx !== 0) {
        const heroBtn = document.createElement("button");
        heroBtn.type = "button";
        heroBtn.textContent = "הפוך להירו";
        heroBtn.style.cssText = "font-size:0.6rem;background:#fff;border:none;padding:2px 6px;cursor:pointer;";
        heroBtn.addEventListener("click", () => {
          const [moved] = data.images.splice(idx, 1);
          data.images.unshift(moved);
          saveData(data);
          renderImages();
        });
        actions.appendChild(heroBtn);
      }
      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.textContent = "✕";
      delBtn.style.cssText = "font-size:0.7rem;background:#fff;border:none;padding:2px 7px;cursor:pointer;color:#b96a55;";
      delBtn.addEventListener("click", () => {
        if (data.images.length <= 1) {
          alert("חייבת להישאר לפחות תמונה אחת.");
          return;
        }
        if (confirm("להסיר את התמונה?")) {
          data.images.splice(idx, 1);
          saveData(data);
          renderImages();
        }
      });
      actions.appendChild(delBtn);
      tile.appendChild(actions);
      grid.appendChild(tile);
    });
  }

  $("#imageUploadInput").addEventListener("change", (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const maxW = 1600;
          const scale = Math.min(1, maxW / img.width);
          const canvas = document.createElement("canvas");
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
          data.images.push({ file: dataUrl, tag: "custom" });
          try {
            saveData(data);
          } catch (err) {
            alert("שגיאה בשמירה — ייתכן שאחסון הדפדפן מלא. נסו תמונה קטנה יותר או הסירו תמונות ישנות.");
            data.images.pop();
            return;
          }
          renderImages();
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
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
        else if (info.closed) cls += " is-closed";
        else if (data.pricing.days[dateKey] && data.pricing.days[dateKey].price) cls += " is-custom-price";

        if (selRange.start && dateKey >= selRange.start && dateKey <= (selRange.end || selRange.start)) {
          cls += " is-checked";
        }

        const priceHtml = !isPast ? `<span class="p">${info.closed ? "✕" : fmtMoneyCompact(info.price)}</span>` : "";
        rowCells += `<td><button type="button" class="${cls}" data-date="${dateKey}" ${isPast ? "disabled" : ""}>${dayNum}${priceHtml}</button></td>`;
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
    $$(".mini-day[data-date]:not([disabled])", wrap).forEach((btn) => {
      btn.addEventListener("click", () => onAdmDayClick(btn.dataset.date));
    });
    $("#admCalRangeLabel").textContent = `${HE_MONTHS[admViewMonth]} ${admViewYear}`;
    $("#admCalPrev").disabled = admViewYear === today.getFullYear() && admViewMonth === today.getMonth();
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

  function eachDateInRange(startKey, endKey, cb) {
    let cursor = new Date(startKey);
    const end = new Date(endKey || startKey);
    while (cursor <= end) {
      cb(fmtDateKey(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  $("#setPriceBtn").addEventListener("click", () => {
    if (!selRange.start) return alert("בחרו קודם טווח תאריכים ביומן.");
    const price = Number($("#rangePriceInput").value);
    if (!price || price <= 0) return alert("הזינו מחיר תקין.");
    eachDateInRange(selRange.start, selRange.end, (key) => {
      const existing = data.pricing.days[key] || {};
      data.pricing.days[key] = { ...existing, price, closed: false };
    });
    saveData(data);
    renderMiniCalendars();
    flashStatus("#contentSaveStatus");
  });

  $("#closeRangeBtn").addEventListener("click", () => {
    if (!selRange.start) return alert("בחרו קודם טווח תאריכים ביומן.");
    eachDateInRange(selRange.start, selRange.end, (key) => {
      const existing = data.pricing.days[key] || {};
      data.pricing.days[key] = { ...existing, closed: true };
    });
    saveData(data);
    renderMiniCalendars();
  });

  $("#reopenRangeBtn").addEventListener("click", () => {
    if (!selRange.start) return alert("בחרו קודם טווח תאריכים ביומן.");
    eachDateInRange(selRange.start, selRange.end, (key) => {
      if (data.pricing.days[key]) {
        data.pricing.days[key].closed = false;
      }
    });
    saveData(data);
    renderMiniCalendars();
  });

  $("#clearSelectionBtn").addEventListener("click", () => {
    selRange = { start: null, end: null };
    updateRangeSummary();
    renderMiniCalendars();
  });

  /* ---------------- Settings panel ---------------- */
  function loadSettingsForm() {
    $("#f-basePrice").value = data.pricing.basePrice;
    $("#f-minNights").value = data.pricing.minNights;
    $("#f-contactEmail").value = data.contactEmail;
    $("#f-adminUser").value = data.admin.username;
  }

  $("#saveSettingsBtn").addEventListener("click", () => {
    data.pricing.basePrice = Number($("#f-basePrice").value) || data.pricing.basePrice;
    data.pricing.minNights = Number($("#f-minNights").value) || data.pricing.minNights;
    data.contactEmail = $("#f-contactEmail").value || data.contactEmail;
    saveData(data);
    flashStatus("#settingsSaveStatus");
    renderMiniCalendars();
  });

  $("#savePassBtn").addEventListener("click", () => {
    const user = $("#f-adminUser").value.trim();
    const p1 = $("#f-newPass").value;
    const p2 = $("#f-newPass2").value;
    if (!user) return alert("יש להזין שם משתמש.");
    if (p1 || p2) {
      if (p1.length < 6) return alert("הסיסמה חייבת להכיל לפחות 6 תווים.");
      if (p1 !== p2) return alert("אימות הסיסמה אינו תואם.");
      data.admin.passwordHash = simpleHash(p1);
    }
    data.admin.username = user;
    saveData(data);
    $("#f-newPass").value = "";
    $("#f-newPass2").value = "";
    flashStatus("#passSaveStatus");
  });

  $("#resetDataBtn").addEventListener("click", () => {
    if (confirm("לאפס את כל התוכן, התמונות והיומן לברירת המחדל? הפעולה אינה הפיכה.")) {
      data = resetData();
      initAdminUI();
      alert("הנתונים אופסו.");
    }
  });

  /* ---------------- Init ---------------- */
  let sidebarInit = false;
  function initAdminUI() {
    if (!sidebarInit) {
      initSidebar();
      sidebarInit = true;
    }
    loadContentForm();
    renderImages();
    renderMiniCalendars();
    updateRangeSummary();
    loadSettingsForm();
  }
})();
