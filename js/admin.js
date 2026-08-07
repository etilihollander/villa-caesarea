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

  $("#saveContentBtn").addEventListener("click", async () => {
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
  function renderImages() {
    const grid = $("#imageGrid");
    grid.innerHTML = "";
    data.images.forEach((img) => {
      const tile = document.createElement("div");
      tile.className = "image-tile";
      tile.innerHTML = `
        <img src="${img.file}" alt="">
        ${img.isHero ? '<span class="hero-badge">הירו</span>' : ""}
        <span class="tag-badge">${img.tag || ""}</span>
      `;
      const actions = document.createElement("div");
      actions.style.cssText = "position:absolute;top:6px;left:6px;display:flex;gap:4px;";
      if (!img.isHero) {
        const heroBtn = document.createElement("button");
        heroBtn.type = "button";
        heroBtn.textContent = "הפוך להירו";
        heroBtn.style.cssText = "font-size:0.6rem;background:#fff;border:none;padding:2px 6px;cursor:pointer;";
        heroBtn.addEventListener("click", async () => {
          heroBtn.disabled = true;
          try {
            await setHeroImage(img.id);
            await refreshAllData();
          } catch (err) {
            alert("שגיאה: " + err.message);
          }
        });
        actions.appendChild(heroBtn);
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
  let monthlyOverrides = {};
  let monthlyYear = today.getFullYear();

  function fmtILS(n) {
    return "₪" + Math.round(n).toLocaleString("he-IL");
  }

  function sumCosts(list) {
    return (list || []).reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
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
        renderMonthlyBalanceTable();
      });
    });
    $$("[data-remove]", wrap).forEach((btn) => {
      btn.addEventListener("click", () => {
        list.splice(Number(btn.dataset.remove), 1);
        renderCostEditor(wrapId, totalId, list);
        renderCostTotal(totalId, list);
        renderForecastTable();
        renderMonthlyBalanceTable();
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
    const opTotal = sumCosts(finance.operationalCosts);
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

  function computeMonthlyExpenseDefault(nightsClosed) {
    const opTotal = sumCosts(finance.operationalCosts);
    const fixedTotal = sumCosts(finance.fixedCosts);
    return nightsClosed * opTotal + fixedTotal / 12;
  }

  function renderMonthlyBalanceTable() {
    $("#monthlyYearLabel").textContent = String(monthlyYear);
    const table = $("#monthlyBalanceTable");
    const head = `<thead><tr>
      <th>חודש</th><th>לילות שנסגרו</th><th>הכנסה בפועל</th><th>הוצאה</th><th>מאזן</th>
    </tr></thead>`;
    const rows = [];
    for (let m = 0; m < 12; m++) {
      const monthKey = `${monthlyYear}-${String(m + 1).padStart(2, "0")}`;
      const actual = actualByMonth[monthKey] || { nights: 0, income: 0 };
      const defaultExpense = computeMonthlyExpenseDefault(actual.nights);
      const override = monthlyOverrides[monthKey];
      const hasOverride = override !== undefined && override !== null;
      const expense = hasOverride ? override : defaultExpense;
      const balance = actual.income - expense;
      rows.push(`<tr>
        <td>${HE_MONTHS[m]}</td>
        <td class="num">${actual.nights}</td>
        <td class="num">${fmtILS(actual.income)}</td>
        <td class="num">
          <div class="expense-cell">
            <input type="number" class="expense-input${hasOverride ? " is-custom" : ""}" data-month="${monthKey}" value="${Math.round(expense)}">
            ${hasOverride ? `<button type="button" class="reset-expense-btn" data-reset="${monthKey}">איפוס</button>` : ""}
          </div>
        </td>
        <td class="num">${fmtILS(balance)}</td>
      </tr>`);
    }
    table.innerHTML = head + `<tbody>${rows.join("")}</tbody>`;

    $$(".expense-input", table).forEach((input) => {
      input.addEventListener("change", async () => {
        const monthKey = input.dataset.month;
        const val = Number(input.value) || 0;
        input.disabled = true;
        try {
          await setMonthlyExpenseOverride(monthKey, val);
          monthlyOverrides[monthKey] = val;
          renderMonthlyBalanceTable();
        } catch (err) {
          alert("שגיאה בשמירה: " + err.message);
          console.error(err);
          input.disabled = false;
        }
      });
    });
    $$("[data-reset]", table).forEach((btn) => {
      btn.addEventListener("click", async () => {
        const monthKey = btn.dataset.reset;
        btn.disabled = true;
        try {
          await setMonthlyExpenseOverride(monthKey, null);
          delete monthlyOverrides[monthKey];
          renderMonthlyBalanceTable();
        } catch (err) {
          alert("שגיאה באיפוס: " + err.message);
          console.error(err);
          btn.disabled = false;
        }
      });
    });
  }

  $("#monthlyYearPrev").addEventListener("click", () => {
    monthlyYear--;
    renderMonthlyBalanceTable();
  });
  $("#monthlyYearNext").addEventListener("click", () => {
    monthlyYear++;
    renderMonthlyBalanceTable();
  });

  async function loadFinancePanel() {
    renderCostEditor("#opCostsEditor", "#opCostsTotal", finance.operationalCosts);
    renderCostEditor("#fixedCostsEditor", "#fixedCostsTotal", finance.fixedCosts);
    $("#forecastNightsInput").value = finance.forecastNights.join(", ");
    $("#forecastPricesInput").value = finance.forecastPrices.join(", ");
    renderForecastTable();

    $("#actualTable").innerHTML = `<tr class="empty-row"><td>טוען...</td></tr>`;
    $("#monthlyBalanceTable").innerHTML = `<tr class="empty-row"><td>טוען...</td></tr>`;
    try {
      const stats = await loadActualBookingStats(data.pricing.basePrice);
      actualByYear = stats.byYear;
      actualByMonth = stats.byMonth;
      monthlyOverrides = await loadMonthlyExpenseOverrides();
    } catch (err) {
      console.error(err);
      $("#actualTable").innerHTML = `<tr class="empty-row"><td>שגיאה בטעינת נתוני ההזמנות בפועל.</td></tr>`;
      $("#monthlyBalanceTable").innerHTML = `<tr class="empty-row"><td>שגיאה בטעינה.</td></tr>`;
      return;
    }
    renderActualTable();
    renderMonthlyBalanceTable();
  }

  $("#addOpCostBtn").addEventListener("click", () => {
    finance.operationalCosts.push({ label: "", amount: 0 });
    renderCostEditor("#opCostsEditor", "#opCostsTotal", finance.operationalCosts);
    renderForecastTable();
    renderMonthlyBalanceTable();
  });

  $("#addFixedCostBtn").addEventListener("click", () => {
    finance.fixedCosts.push({ label: "", amount: 0 });
    renderCostEditor("#fixedCostsEditor", "#fixedCostsTotal", finance.fixedCosts);
    renderForecastTable();
    renderMonthlyBalanceTable();
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
      await updateFinanceSettings(finance);
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
