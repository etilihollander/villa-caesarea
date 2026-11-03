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
      // scoped to this panel's tabs — other panels have their own language tabs
      $$(".lang-tabs button[data-content-lang]").forEach((b) => b.classList.remove("active"));
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

  /* ===================================================================
     Celebrations panel — full content management for celebrations.html
     and for the promo teaser on the home page.

     The whole page is one jsonb document (see loadCelebrations in
     js/data.js). Text inputs write straight into the in-memory document
     so switching language tabs never loses an edit; the Save button
     persists it. Image actions persist immediately, because the file is
     already in Storage by then and the URL must not be lost.
     =================================================================== */
  let cel = null;
  let celLang = "he";
  let celDirty = false;

  const CEL_ICON_OPTIONS = [
    { key: "pool", label: "בריכה" },
    { key: "suite", label: "חדר שינה / סוויטה" },
    { key: "garden", label: "גינה" },
    { key: "privacy", label: "פרטיות" },
    { key: "chef", label: "מטבח / שף" },
    { key: "view", label: "נוף" },
    { key: "dining", label: "פינת אוכל" },
    { key: "toast", label: "הרמת כוסית" },
    { key: "music", label: "מוזיקה" },
    { key: "games", label: "משחקים" },
    { key: "kids", label: "ילדים" },
    { key: "parking", label: "חניה" },
    { key: "beach", label: "חוף ים" },
    { key: "ac", label: "מיזוג" },
    { key: "wifi", label: "אינטרנט" }
  ];

  function celNode(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function markCelDirty() {
    celDirty = true;
    const note = $("#celDirtyNote");
    if (note) note.hidden = false;
  }

  /* A labelled text input / textarea bound live to target[key]. */
  function celField(labelText, target, key, opts) {
    const o = opts || {};
    const field = celNode("div", "field");
    field.appendChild(celNode("label", null, labelText));
    const input = document.createElement(o.rows ? "textarea" : "input");
    if (o.rows) input.rows = o.rows;
    else input.type = "text";
    if (o.placeholder) input.placeholder = o.placeholder;
    input.value = target[key] || "";
    input.dir = celLang === "he" ? "rtl" : "ltr";
    input.addEventListener("input", () => {
      target[key] = input.value;
      markCelDirty();
    });
    field.appendChild(input);
    if (o.hint) {
      const hint = celNode("div", "settings-note", o.hint);
      hint.style.marginTop = "0.4rem";
      field.appendChild(hint);
    }
    return field;
  }

  function celCard(titleText, descText) {
    const card = celNode("div", "admin-card");
    card.appendChild(celNode("h3", null, titleText));
    if (descText) {
      const p = celNode("p", "desc", descText);
      p.style.marginBottom = "1rem";
      card.appendChild(p);
    }
    const grid = celNode("div", "form-grid");
    card.appendChild(grid);
    card.body = grid;
    return card;
  }

  /* Is this URL still referenced anywhere? Used before deleting a file from
     Storage, so a photo shared between sections (or taken from the villa
     gallery) is only unlinked, never destroyed. */
  function celUrlInUse(url) {
    if (!url) return true;
    if (data && data.images && data.images.some((img) => img.file === url)) return true;
    const used = [cel.hero.image.url, cel.promo.image.url];
    cel.categories.forEach((cat) => {
      used.push(cat.image.url);
      cat.gallery.forEach((img) => used.push(img.url));
    });
    return used.indexOf(url) !== -1;
  }

  async function celReleaseImages(urls) {
    for (const url of urls || []) {
      if (!url || celUrlInUse(url)) continue;
      try {
        await removeStorageImage(url);
      } catch (err) {
        console.warn("Could not remove unused celebration image from storage", err);
      }
    }
  }

  async function persistCel(opts) {
    const o = opts || {};
    try {
      await updateCelebrations(cel);
      celDirty = false;
      const note = $("#celDirtyNote");
      if (note) note.hidden = true;
      if (o.release) await celReleaseImages(o.release);
      if (o.rerender) renderCelEditor();
      flashStatus("#celSaveStatus");
      return true;
    } catch (err) {
      alert("שגיאה בשמירה: " + err.message);
      console.error(err);
      return false;
    }
  }

  /* ---- a single image slot: preview, upload/replace, pick, remove, alt ---- */
  function celImageEditor(owner, labelText, hintText) {
    const wrap = celNode("div", "cel-image-editor");
    wrap.appendChild(celNode("label", null, labelText));

    const row = celNode("div", "cel-image-row");

    const preview = celNode("div", "cel-image-preview");
    if (owner.url) {
      const img = document.createElement("img");
      img.src = owner.url;
      img.alt = "";
      preview.appendChild(img);
    } else {
      preview.classList.add("is-empty");
      preview.appendChild(celNode("span", null, "אין תמונה"));
    }
    row.appendChild(preview);

    const actions = celNode("div", "cel-image-actions");

    const fileLabel = celNode("label", "cel-upload-btn", owner.url ? "החלפת תמונה" : "העלאת תמונה");
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.style.display = "none";
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      fileLabel.textContent = "מעלה...";
      const previousUrl = owner.url;
      try {
        owner.url = await uploadImageToStorage(file, "celebrations");
        await persistCel({ release: [previousUrl], rerender: true });
      } catch (err) {
        alert("שגיאה בהעלאת תמונה: " + err.message);
        console.error(err);
        renderCelEditor();
      }
    });
    fileLabel.appendChild(fileInput);
    actions.appendChild(fileLabel);

    // reuse a photo that is already on the site instead of uploading again
    const picker = document.createElement("select");
    picker.className = "cel-image-picker";
    picker.appendChild(new Option("בחירה מתמונות הוילה…", ""));
    (data && data.images ? data.images : []).forEach((img, i) => {
      const tag = TAG_OPTIONS.find((o) => o.value === img.tag);
      picker.appendChild(new Option((tag ? tag.label : "תמונה") + " " + (i + 1), img.file));
    });
    picker.addEventListener("change", async () => {
      if (!picker.value) return;
      const previousUrl = owner.url;
      owner.url = picker.value;
      await persistCel({ release: [previousUrl], rerender: true });
    });
    actions.appendChild(picker);

    if (owner.url) {
      const removeBtn = celNode("button", "cel-danger-btn", "הסרת התמונה");
      removeBtn.type = "button";
      removeBtn.addEventListener("click", async () => {
        if (!confirm("להסיר את התמונה מהקטע הזה?")) return;
        const previousUrl = owner.url;
        owner.url = "";
        await persistCel({ release: [previousUrl], rerender: true });
      });
      actions.appendChild(removeBtn);
    }

    row.appendChild(actions);
    wrap.appendChild(row);

    wrap.appendChild(
      celField(
        celLang === "he" ? "טקסט חלופי לתמונה (alt, עברית)" : "Image alt text (English)",
        owner.alt,
        celLang,
        { placeholder: celLang === "he" ? "למשל: הבריכה הפרטית בווילה גפן" : "e.g. The private pool at Villa Gefen" }
      )
    );

    if (hintText) {
      const hint = celNode("div", "settings-note", hintText);
      hint.style.marginTop = "0.5rem";
      wrap.appendChild(hint);
    }
    return wrap;
  }

  /* ---- the gallery of one celebration category ---- */
  function celGalleryEditor(cat) {
    const wrap = celNode("div", "cel-gallery-editor");
    const head = celNode("div", "cel-subhead");
    head.appendChild(celNode("strong", null, "גלריית תמונות לקטגוריה"));
    head.appendChild(
      celNode("span", null, cat.gallery.length ? cat.gallery.length + " תמונות" : "אין תמונות — הגלריה לא תוצג באתר")
    );
    wrap.appendChild(head);

    const uploadLabel = celNode("label", "upload-drop cel-gallery-upload");
    uploadLabel.appendChild(celNode("span", null, "לחצו כדי להעלות תמונות לקטגוריה הזו (אפשר כמה בבת אחת)"));
    const uploadInput = document.createElement("input");
    uploadInput.type = "file";
    uploadInput.accept = "image/*";
    uploadInput.multiple = true;
    uploadInput.style.display = "none";
    uploadInput.addEventListener("change", async () => {
      const files = Array.from(uploadInput.files || []);
      if (!files.length) return;
      const span = uploadLabel.querySelector("span");
      let failed = 0;
      for (let i = 0; i < files.length; i++) {
        span.textContent = `מעלה ${i + 1} מתוך ${files.length}...`;
        try {
          const url = await uploadImageToStorage(files[i], "celebrations");
          cat.gallery.push({ url, alt: { he: "", en: "" } });
        } catch (err) {
          failed++;
          console.error(err);
        }
      }
      await persistCel({ rerender: true });
      if (failed) alert(failed + " תמונות לא הועלו. נסו שוב.");
    });
    uploadLabel.appendChild(uploadInput);
    wrap.appendChild(uploadLabel);

    if (cat.gallery.length) {
      const grid = celNode("div", "cel-gallery-grid");
      cat.gallery.forEach((img, idx) => {
        const tile = celNode("div", "cel-gallery-tile");
        const thumb = document.createElement("img");
        thumb.src = img.url;
        thumb.alt = "";
        tile.appendChild(thumb);

        const bar = celNode("div", "cel-tile-bar");
        const back = celNode("button", null, "◀");
        back.type = "button";
        back.title = "הזזה אחורה";
        back.disabled = idx === 0;
        back.addEventListener("click", async () => {
          cat.gallery.splice(idx - 1, 0, cat.gallery.splice(idx, 1)[0]);
          await persistCel({ rerender: true });
        });
        const fwd = celNode("button", null, "▶");
        fwd.type = "button";
        fwd.title = "הזזה קדימה";
        fwd.disabled = idx === cat.gallery.length - 1;
        fwd.addEventListener("click", async () => {
          cat.gallery.splice(idx + 1, 0, cat.gallery.splice(idx, 1)[0]);
          await persistCel({ rerender: true });
        });
        const del = celNode("button", "is-danger", "מחיקה");
        del.type = "button";
        del.addEventListener("click", async () => {
          if (!confirm("למחוק את התמונה מהגלריה?")) return;
          const removed = cat.gallery.splice(idx, 1)[0];
          await persistCel({ release: [removed.url], rerender: true });
        });
        bar.appendChild(back);
        bar.appendChild(fwd);
        bar.appendChild(del);
        tile.appendChild(bar);

        const altInput = document.createElement("input");
        altInput.type = "text";
        altInput.className = "cel-tile-alt";
        altInput.placeholder = celLang === "he" ? "טקסט חלופי (alt)" : "Image alt text";
        altInput.value = img.alt[celLang] || "";
        altInput.dir = celLang === "he" ? "rtl" : "ltr";
        altInput.addEventListener("input", () => {
          img.alt[celLang] = altInput.value;
          markCelDirty();
        });
        tile.appendChild(altInput);

        grid.appendChild(tile);
      });
      wrap.appendChild(grid);
    }

    return wrap;
  }

  /* ---- one celebration category ---- */
  function celCategoryEditor(cat, index) {
    const card = celNode("div", "admin-card cel-category-card" + (cat.hidden ? " is-hidden-cat" : ""));

    const head = celNode("div", "cel-cat-head");
    const title = celNode("h3", null, (cat[celLang].title || "קטגוריה ללא שם") + (cat.hidden ? " — מוסתרת" : ""));
    head.appendChild(title);

    const controls = celNode("div", "cel-cat-controls");
    const up = celNode("button", null, "▲");
    up.type = "button";
    up.title = "העלאה בסדר התצוגה";
    up.disabled = index === 0;
    up.addEventListener("click", async () => {
      cel.categories.splice(index - 1, 0, cel.categories.splice(index, 1)[0]);
      await persistCel({ rerender: true });
    });
    const down = celNode("button", null, "▼");
    down.type = "button";
    down.title = "הורדה בסדר התצוגה";
    down.disabled = index === cel.categories.length - 1;
    down.addEventListener("click", async () => {
      cel.categories.splice(index + 1, 0, cel.categories.splice(index, 1)[0]);
      await persistCel({ rerender: true });
    });
    const hide = celNode("button", null, cat.hidden ? "הצגה באתר" : "הסתרה מהאתר");
    hide.type = "button";
    hide.addEventListener("click", async () => {
      cat.hidden = !cat.hidden;
      await persistCel({ rerender: true });
    });
    const del = celNode("button", "is-danger", "מחיקת הקטגוריה");
    del.type = "button";
    del.addEventListener("click", async () => {
      if (!confirm('למחוק את הקטגוריה "' + (cat[celLang].title || cat.id) + '" ואת הגלריה שלה? הפעולה אינה ניתנת לביטול.')) return;
      const removed = cel.categories.splice(index, 1)[0];
      const urls = [removed.image.url].concat(removed.gallery.map((img) => img.url));
      await persistCel({ release: urls, rerender: true });
    });
    [up, down, hide, del].forEach((btn) => controls.appendChild(btn));
    head.appendChild(controls);
    card.appendChild(head);

    const grid = celNode("div", "form-grid");
    grid.appendChild(celField("כותרת הקטגוריה", cat[celLang], "title"));
    grid.appendChild(
      celField("תיאור", cat[celLang], "desc", {
        rows: 4,
        hint: "שורה ריקה כפולה בין פסקאות תיצור פסקה חדשה באתר."
      })
    );
    grid.appendChild(celImageEditor(cat.image, "תמונה ראשית לקטגוריה", "כל עוד לא הועלתה תמונה, האתר מציג מסגרת מעוצבת במקומה — בלי תמונת סטוק."));
    grid.appendChild(celGalleryEditor(cat));
    card.appendChild(grid);

    return card;
  }

  /* ---- the whole panel ---- */
  function renderCelEditor() {
    const root = $("#celEditor");
    if (!root || !cel) return;
    root.innerHTML = "";

    /* Hero */
    const hero = celCard("ראש העמוד (Hero)", "התמונה הגדולה, הכותרת ומשפט הפתיחה בראש העמוד.");
    hero.body.appendChild(celField("כותרת עליונה (Eyebrow)", cel.hero[celLang], "eyebrow"));
    hero.body.appendChild(celField("כותרת ראשית (H1)", cel.hero[celLang], "title", { rows: 2 }));
    hero.body.appendChild(celField("משפט פתיחה", cel.hero[celLang], "intro", { rows: 3 }));
    hero.body.appendChild(
      celImageEditor(cel.hero.image, "תמונת ראש העמוד", "כל עוד לא נבחרה תמונה, מוצגת תמונת ההירו של עמוד הבית.")
    );
    root.appendChild(hero);

    /* Clarifying notice */
    const notice = celCard("הבהרה למבקרים", 'הפסקה המודגשת מתחת לראש העמוד — למשל שהוילה אינה אולם אירועים.');
    notice.body.appendChild(celField("טקסט ההבהרה", cel.notice, celLang, { rows: 3 }));
    root.appendChild(notice);

    /* Categories head */
    const catHead = celCard("כותרת מקטע הקטגוריות", "הכותרות שמעל רשימת סוגי האירועים.");
    catHead.body.appendChild(celField("כותרת עליונה (Eyebrow)", cel.categoriesHead[celLang], "eyebrow"));
    catHead.body.appendChild(celField("כותרת", cel.categoriesHead[celLang], "title"));
    catHead.body.appendChild(celField("תיאור", cel.categoriesHead[celLang], "desc", { rows: 2 }));
    root.appendChild(catHead);

    /* Categories */
    const catsHead = celNode("div", "cel-section-head");
    catsHead.appendChild(celNode("h3", null, "קטגוריות החגיגות"));
    catsHead.appendChild(
      celNode("p", "desc", "סדר הכרטיסים כאן הוא הסדר באתר. אפשר להוסיף קטגוריות חדשות, להסתיר קטגוריה בלי למחוק אותה, ולנהל גלריה נפרדת לכל אחת.")
    );
    root.appendChild(catsHead);

    if (!cel.categories.length) {
      root.appendChild(celNode("div", "settings-note", "אין קטגוריות. הוסיפו קטגוריה ראשונה בכפתור שלמטה."));
    }
    cel.categories.forEach((cat, i) => root.appendChild(celCategoryEditor(cat, i)));

    const addCat = celNode("button", "add-amenity-btn", "+ הוספת קטגוריית חגיגה");
    addCat.type = "button";
    addCat.addEventListener("click", async () => {
      cel.categories.push({
        id: "category-" + Date.now().toString(36),
        hidden: true,
        image: { url: "", alt: { he: "", en: "" } },
        gallery: [],
        he: { title: "קטגוריה חדשה", desc: "" },
        en: { title: "New category", desc: "" }
      });
      await persistCel({ rerender: true });
    });
    root.appendChild(addCat);

    /* Why Villa Gefen */
    const why = celCard("למה וילה גפן", "המקטע שמדגיש את מה שהוילה מציעה לאירוע.");
    why.body.appendChild(celField("כותרת עליונה (Eyebrow)", cel.why[celLang], "eyebrow"));
    why.body.appendChild(celField("כותרת", cel.why[celLang], "title"));
    why.body.appendChild(celField("תיאור", cel.why[celLang], "desc", { rows: 2 }));

    const items = celNode("div", "cel-why-items");
    cel.why.items.forEach((item, idx) => {
      const row = celNode("div", "cel-why-row");

      const iconSelect = document.createElement("select");
      iconSelect.appendChild(new Option("ללא אייקון", ""));
      CEL_ICON_OPTIONS.forEach((opt) => {
        const option = new Option(opt.label, opt.key);
        if (opt.key === item.icon) option.selected = true;
        iconSelect.appendChild(option);
      });
      iconSelect.addEventListener("change", () => {
        item.icon = iconSelect.value;
        markCelDirty();
      });
      row.appendChild(iconSelect);

      const fields = celNode("div", "cel-why-fields");
      const titleInput = document.createElement("input");
      titleInput.type = "text";
      titleInput.placeholder = celLang === "he" ? "כותרת" : "Title";
      titleInput.value = item[celLang].title || "";
      titleInput.dir = celLang === "he" ? "rtl" : "ltr";
      titleInput.addEventListener("input", () => {
        item[celLang].title = titleInput.value;
        markCelDirty();
      });
      const descInput = document.createElement("textarea");
      descInput.rows = 2;
      descInput.placeholder = celLang === "he" ? "תיאור" : "Description";
      descInput.value = item[celLang].desc || "";
      descInput.dir = celLang === "he" ? "rtl" : "ltr";
      descInput.addEventListener("input", () => {
        item[celLang].desc = descInput.value;
        markCelDirty();
      });
      fields.appendChild(titleInput);
      fields.appendChild(descInput);
      row.appendChild(fields);

      const ctrls = celNode("div", "cel-why-controls");
      const up = celNode("button", null, "▲");
      up.type = "button";
      up.disabled = idx === 0;
      up.addEventListener("click", async () => {
        cel.why.items.splice(idx - 1, 0, cel.why.items.splice(idx, 1)[0]);
        await persistCel({ rerender: true });
      });
      const down = celNode("button", null, "▼");
      down.type = "button";
      down.disabled = idx === cel.why.items.length - 1;
      down.addEventListener("click", async () => {
        cel.why.items.splice(idx + 1, 0, cel.why.items.splice(idx, 1)[0]);
        await persistCel({ rerender: true });
      });
      const remove = celNode("button", "is-danger", "×");
      remove.type = "button";
      remove.title = "הסרה";
      remove.addEventListener("click", async () => {
        cel.why.items.splice(idx, 1);
        await persistCel({ rerender: true });
      });
      [up, down, remove].forEach((b) => ctrls.appendChild(b));
      row.appendChild(ctrls);

      items.appendChild(row);
    });
    why.body.appendChild(items);

    const addWhy = celNode("button", "add-amenity-btn", "+ הוספת יתרון");
    addWhy.type = "button";
    addWhy.addEventListener("click", async () => {
      cel.why.items.push({
        id: "item-" + Date.now().toString(36),
        icon: "",
        he: { title: "", desc: "" },
        en: { title: "", desc: "" }
      });
      await persistCel({ rerender: true });
    });
    why.body.appendChild(addWhy);
    root.appendChild(why);

    /* Contact CTA */
    const cta = celCard("קריאה לפעולה — יצירת קשר", "המקטע שבתחתית העמוד, כולל כפתור הוואטסאפ והערת התיאום מראש.");
    cta.body.appendChild(celField("כותרת עליונה (Eyebrow)", cel.cta[celLang], "eyebrow"));
    cta.body.appendChild(celField("כותרת", cel.cta[celLang], "title"));
    cta.body.appendChild(celField("תיאור", cel.cta[celLang], "desc", { rows: 2 }));
    cta.body.appendChild(
      celField("טקסט כפתור הוואטסאפ", cel.cta[celLang], "button", {
        hint: "הכפתור מוצג רק אם הוגדר מספר טלפון בלשונית ההגדרות, והוא מפנה ל-WhatsApp של אותו מספר."
      })
    );
    cta.body.appendChild(
      celField("הודעה מוכנה לוואטסאפ", cel.cta[celLang], "whatsappMessage", {
        rows: 2,
        hint: "הטקסט שיופיע כבר מוקלד בשיחה שהמבקר פותח."
      })
    );
    cta.body.appendChild(
      celField("טקסט כפתור משני", cel.cta[celLang], "secondaryButton", {
        hint: "מפנה לטופס הפנייה בעמוד הבית. השאירו ריק כדי להסתיר את הכפתור."
      })
    );
    cta.body.appendChild(
      celField("הערת תיאום מראש ואישור", cel.cta[celLang], "note", {
        rows: 3,
        hint: "מוצגת בתחתית המקטע בטקסט קטן."
      })
    );
    root.appendChild(cta);

    /* Home-page promo */
    const promo = celCard("קטע קידום בעמוד הבית", "הכרטיס שמופיע בעמוד הבית ומוביל לעמוד החגיגות.");
    const toggle = celNode("div", "field");
    const toggleLabel = celNode("label", null, "הצגת הקטע בעמוד הבית");
    const toggleSelect = document.createElement("select");
    toggleSelect.appendChild(new Option("כן — הקטע מוצג", "true"));
    toggleSelect.appendChild(new Option("לא — הקטע מוסתר", "false"));
    toggleSelect.value = cel.promo.enabled ? "true" : "false";
    toggleSelect.addEventListener("change", () => {
      cel.promo.enabled = toggleSelect.value === "true";
      markCelDirty();
    });
    toggle.appendChild(toggleLabel);
    toggle.appendChild(toggleSelect);
    promo.body.appendChild(toggle);
    promo.body.appendChild(celField("כותרת עליונה (Eyebrow)", cel.promo[celLang], "eyebrow"));
    promo.body.appendChild(celField("כותרת", cel.promo[celLang], "title"));
    promo.body.appendChild(celField("תיאור", cel.promo[celLang], "desc", { rows: 2 }));
    promo.body.appendChild(celField("טקסט הכפתור", cel.promo[celLang], "button"));
    promo.body.appendChild(celImageEditor(cel.promo.image, "תמונת הקטע", "כל עוד לא נבחרה תמונה, מוצגת מסגרת מעוצבת."));
    root.appendChild(promo);

    /* Nav label + SEO */
    const meta = celCard("ניווט וקידום בגוגל (SEO)", "שם הפריט בתפריט האתר, וכותרת/תיאור העמוד במנועי החיפוש.");
    meta.body.appendChild(
      celField("שם הפריט בתפריט", cel.nav, celLang, { hint: "מוצג בתפריט הראשי בעמוד הבית ובעמוד החגיגות." })
    );
    meta.body.appendChild(
      celField("כותרת העמוד (Title)", cel.seo[celLang], "title", { hint: "מומלץ עד 60 תווים." })
    );
    meta.body.appendChild(
      celField("תיאור העמוד (Meta description)", cel.seo[celLang], "description", {
        rows: 3,
        hint: "מומלץ 120–160 תווים."
      })
    );
    root.appendChild(meta);
  }

  /* Reloads from Supabase, but never over unsaved text edits. */
  async function loadCelPanel() {
    if (cel && celDirty) {
      renderCelEditor();
      return;
    }
    cel = await loadCelebrations();
    renderCelEditor();
  }

  $$(".lang-tabs button[data-cel-lang]").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$(".lang-tabs button[data-cel-lang]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      celLang = btn.dataset.celLang;
      renderCelEditor();
    });
  });

  $("#saveCelBtn").addEventListener("click", async () => {
    const btn = $("#saveCelBtn");
    btn.disabled = true;
    try {
      await persistCel();
    } finally {
      btn.disabled = false;
    }
  });

  // "unsaved changes" marker next to the save button
  (function addCelDirtyNote() {
    const bar = $("#panel-celebrations .save-bar");
    if (!bar) return;
    const note = celNode("span", "cel-dirty-note", "יש שינויי טקסט שלא נשמרו");
    note.id = "celDirtyNote";
    note.hidden = true;
    bar.appendChild(note);
  })();

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
      delBtn.textContent = "מחיקה לצמיתות";
      delBtn.style.cssText = "font-size:0.6rem;background:#b96a55;border:none;padding:2px 7px;cursor:pointer;color:#fff;font-weight:600;border-radius:3px;";
      delBtn.addEventListener("click", async () => {
        if (data.images.length <= 1) {
          alert("חייבת להישאר לפחות תמונה אחת.");
          return;
        }
        if (confirm("למחוק את התמונה לצמיתות? פעולה זו אינה ניתנת לביטול והתמונה תוסר גם מהאתר וגם מהאחסון.")) {
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

  /* ---------------- Enquiries panel ---------------- */
  let enquiries = [];

  function fmtEnqDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("he-IL", { day: "numeric", month: "short", year: "numeric" });
  }

  function fmtEnqTime(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString("he-IL", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  async function renderEnquiries() {
    const list = $("#enquiriesList");
    const stats = $("#enquiriesStats");
    const unread = enquiries.filter((e) => !e.is_read).length;
    stats.textContent = `${enquiries.length} פניות סה״כ · ${unread} חדשות`;

    if (!enquiries.length) {
      list.innerHTML = '<p class="enquiries-empty">אין פניות עדיין.</p>';
      return;
    }

    list.innerHTML = enquiries.map((enq) => `
      <div class="enquiry-card${enq.is_read ? "" : " is-unread"}" data-id="${enq.id}">
        <div class="enquiry-header">
          <div class="enquiry-name">${enq.is_read ? "" : '<span class="enquiry-dot"></span>'}${escapeHtml(enq.name)}</div>
          <div class="enquiry-date">${fmtEnqTime(enq.created_at)}</div>
        </div>
        <div class="enquiry-details">
          <span class="enquiry-detail"><strong>טלפון:</strong> ${escapeHtml(enq.phone)}</span>
          <span class="enquiry-detail"><strong>אימייל:</strong> ${escapeHtml(enq.email)}</span>
          <span class="enquiry-detail"><strong>אורחים:</strong> ${enq.guests}</span>
          ${enq.checkin ? `<span class="enquiry-detail"><strong>כניסה:</strong> ${fmtEnqDate(enq.checkin)}</span>` : ""}
          ${enq.checkout ? `<span class="enquiry-detail"><strong>יציאה:</strong> ${fmtEnqDate(enq.checkout)}</span>` : ""}
        </div>
        ${enq.message ? `<div class="enquiry-message">${escapeHtml(enq.message)}</div>` : ""}
        <div class="enquiry-actions">
          <a href="mailto:${encodeURIComponent(enq.email)}?subject=${encodeURIComponent("וילה קיסריה — תשובה לפנייתכם")}" class="btn enquiry-reply-btn">↩ השב במייל</a>
          <button type="button" class="btn enquiry-read-btn" data-id="${enq.id}" data-read="${enq.is_read}">${enq.is_read ? "סמן כלא נקרא" : "סמן כנקרא"}</button>
          <button type="button" class="btn enquiry-delete-btn" data-id="${enq.id}">מחיקה</button>
        </div>
      </div>
    `).join("");

    $$(".enquiry-read-btn", list).forEach((btn) => {
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        try {
          const id = Number(btn.dataset.id);
          const currentlyRead = btn.dataset.read === "true";
          await markEnquiryRead(id, !currentlyRead);
          enquiries = await loadEnquiries();
          renderEnquiries();
        } catch (err) {
          alert("שגיאה: " + err.message);
          btn.disabled = false;
        }
      });
    });

    $$(".enquiry-delete-btn", list).forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("למחוק את הפנייה?")) return;
        btn.disabled = true;
        try {
          await deleteEnquiry(Number(btn.dataset.id));
          enquiries = await loadEnquiries();
          renderEnquiries();
        } catch (err) {
          alert("שגיאה: " + err.message);
          btn.disabled = false;
        }
      });
    });
  }

  function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s || "";
    return div.innerHTML;
  }

  async function loadEnquiriesPanel() {
    try {
      enquiries = await loadEnquiries();
      renderEnquiries();
    } catch (err) {
      console.error(err);
      $("#enquiriesList").innerHTML = '<p class="enquiries-empty">שגיאה בטעינת פניות.</p>';
    }
  }

  $("#refreshEnquiriesBtn").addEventListener("click", loadEnquiriesPanel);

  /* ---------------- Settings panel ---------------- */
  async function loadSettingsForm() {
    $("#f-basePrice").value = data.pricing.basePrice;
    $("#f-minNights").value = data.pricing.minNights;
    $("#f-contactEmail").value = data.contactEmail;
    $("#f-contactPhone").value = data.contactPhone || "";
    $("#f-contactInstagram").value = data.contactInstagram || "";
    $("#f-businessName").value = data.businessName || "";
    $("#f-businessId").value = data.businessId || "";
    $("#f-businessAddress").value = data.businessAddress || "";
    $("#f-vatIncluded").value = data.vatIncluded === false ? "false" : "true";
    const session = await getAdminSession();
    if (session && session.user) $("#f-adminEmail").value = session.user.email;
  }

  // both settings cards write the same row, so always send every field —
  // otherwise saving one card would blank out the other card's values
  function collectSettings() {
    return {
      basePrice: Number($("#f-basePrice").value) || data.pricing.basePrice,
      minNights: Number($("#f-minNights").value) || data.pricing.minNights,
      contactEmail: $("#f-contactEmail").value || data.contactEmail,
      contactPhone: $("#f-contactPhone").value.trim(),
      contactInstagram: $("#f-contactInstagram").value.trim(),
      businessName: $("#f-businessName").value.trim(),
      businessId: $("#f-businessId").value.trim(),
      businessAddress: $("#f-businessAddress").value.trim(),
      vatIncluded: $("#f-vatIncluded").value !== "false"
    };
  }

  async function saveSettingsFrom(btnSel, statusSel) {
    const btn = $(btnSel);
    btn.disabled = true;
    try {
      await updateSettings(collectSettings());
      await refreshAllData();
      flashStatus(statusSel);
    } catch (err) {
      alert("שגיאה בשמירה: " + err.message);
    } finally {
      btn.disabled = false;
    }
  }

  $("#saveSettingsBtn").addEventListener("click", () => saveSettingsFrom("#saveSettingsBtn", "#settingsSaveStatus"));
  $("#saveBusinessBtn").addEventListener("click", () => saveSettingsFrom("#saveBusinessBtn", "#businessSaveStatus"));

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
    // a problem on the celebrations page must not block the rest of the panel
    try {
      await loadCelPanel();
    } catch (err) {
      console.error("Failed to load celebrations content", err);
      const root = $("#celEditor");
      if (root && !root.children.length) {
        root.innerHTML =
          '<div class="settings-note">לא ניתן לטעון את תוכן עמוד החגיגות. רעננו את העמוד, ואם הבעיה חוזרת ודאו שטבלת celebrations_content קיימת ב-Supabase.</div>';
      }
    }
    renderImages();
    renderMiniCalendars();
    updateRangeSummary();
    finance = await loadFinanceSettings();
    await loadFinancePanel();
    await loadEnquiriesPanel();
    await loadSettingsForm();

    if (!unsubscribe) {
      unsubscribe = subscribeToVillaChanges(() => {
        // avoid clobbering in-progress edits: just note that a change happened
        // elsewhere; the admin can switch panels to see the latest state.
      });
    }
  }
})();
