/* ===================================================================
   Villa Gefen — shared logic for the static legal pages
   (accessibility.html / privacy.html / terms.html)

   These pages are plain HTML and do not load the full site data layer,
   so this file does two things:
     1. fills in the business identity + VAT wording from Supabase, so the
        owner edits them once in the admin panel instead of in three files
     2. injects the same accessibility widget the main site has, so the
        behaviour matches what the accessibility statement declares
   =================================================================== */

(function () {
  const $ = (sel) => document.querySelector(sel);

  /* ---------------- Accessibility widget ---------------- */
  const A11Y_MODES = ["large-text", "contrast", "links", "readable", "no-motion"];

  function buildA11yWidget() {
    if (document.getElementById("a11yWidget")) return;

    const widget = document.createElement("div");
    widget.className = "a11y-widget";
    widget.id = "a11yWidget";
    widget.innerHTML = `
      <button type="button" class="a11y-hide" id="a11yHide" aria-label="מזעור כפתור הנגישות">&times;</button>
      <button type="button" class="a11y-toggle" id="a11yToggle" aria-expanded="false" aria-controls="a11yPanel" aria-label="תפריט נגישות">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M12 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm9 5.5c.3 0 .5.2.5.5s-.2.5-.5.5c-2.2.4-4.4.7-6.5.8l.4 4.3 2.2 7.2c.1.3-.1.6-.4.7-.3.1-.6-.1-.7-.4l-2.3-6.1h-1.4l-2.3 6.1c-.1.3-.4.5-.7.4-.3-.1-.5-.4-.4-.7l2.2-7.2.4-4.3c-2.1-.1-4.3-.4-6.5-.8-.3 0-.5-.2-.5-.5s.2-.5.5-.5c6 1 12 1 18 0z"/></svg>
      </button>
      <div class="a11y-panel" id="a11yPanel" role="menu" aria-label="אפשרויות נגישות" hidden>
        <div class="a11y-panel-title">נגישות</div>
        <button type="button" role="menuitem" data-a11y="large-text" aria-pressed="false">הגדלת טקסט</button>
        <button type="button" role="menuitem" data-a11y="contrast" aria-pressed="false">ניגודיות גבוהה</button>
        <button type="button" role="menuitem" data-a11y="links" aria-pressed="false">הדגשת קישורים</button>
        <button type="button" role="menuitem" data-a11y="readable" aria-pressed="false">גופן קריא</button>
        <button type="button" role="menuitem" data-a11y="no-motion" aria-pressed="false">עצירת אנימציות</button>
        <button type="button" role="menuitem" id="a11yReset">איפוס הגדרות</button>
        <a href="accessibility.html" role="menuitem">הצהרת נגישות</a>
      </div>`;
    document.body.appendChild(widget);
  }

  function loadPrefs() {
    try {
      return JSON.parse(localStorage.getItem("villaA11y")) || {};
    } catch (e) {
      return {};
    }
  }

  function applyPrefs() {
    const prefs = loadPrefs();
    A11Y_MODES.forEach((mode) => {
      const on = !!prefs[mode];
      document.documentElement.classList.toggle("a11y-" + mode, on);
      const btn = document.querySelector(`.a11y-panel button[data-a11y="${mode}"]`);
      if (btn) btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function applyMinimized() {
    const min = localStorage.getItem("villaA11yMin") === "1";
    const widget = $("#a11yWidget");
    const toggle = $("#a11yToggle");
    if (widget) widget.classList.toggle("is-min", min);
    if (toggle) toggle.setAttribute("aria-label", min ? "הצגת כפתור הנגישות" : "תפריט נגישות");
  }

  function wireA11yWidget() {
    const toggle = $("#a11yToggle");
    const panel = $("#a11yPanel");
    const hideBtn = $("#a11yHide");
    if (!toggle || !panel) return;

    toggle.addEventListener("click", () => {
      const widget = $("#a11yWidget");
      if (widget && widget.classList.contains("is-min")) {
        localStorage.removeItem("villaA11yMin");
        applyMinimized();
        return;
      }
      const open = panel.hidden;
      panel.hidden = !open;
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    if (hideBtn) {
      hideBtn.addEventListener("click", () => {
        localStorage.setItem("villaA11yMin", "1");
        panel.hidden = true;
        toggle.setAttribute("aria-expanded", "false");
        applyMinimized();
        toggle.focus();
      });
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !panel.hidden) {
        panel.hidden = true;
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus();
      }
    });

    document.addEventListener("click", (e) => {
      if (!panel.hidden && !e.target.closest(".a11y-widget")) {
        panel.hidden = true;
        toggle.setAttribute("aria-expanded", "false");
      }
    });

    document.querySelectorAll(".a11y-panel button[data-a11y]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const prefs = loadPrefs();
        const mode = btn.dataset.a11y;
        prefs[mode] = !prefs[mode];
        localStorage.setItem("villaA11y", JSON.stringify(prefs));
        applyPrefs();
      });
    });

    const resetBtn = $("#a11yReset");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        localStorage.removeItem("villaA11y");
        applyPrefs();
      });
    }

    applyPrefs();
    applyMinimized();
  }

  /* ---------------- Business identity & VAT wording ---------------- */
  async function renderLegalInfo() {
    const box = $("#businessInfo");
    const vatLine = $("#vatLine");
    if (!box && !vatLine) return;

    let info;
    try {
      info = await loadLegalInfo();
    } catch (err) {
      console.error("Failed to load business details", err);
      return;
    }

    if (vatLine) {
      vatLine.textContent = info.vatIncluded
        ? 'המחירים המוצגים באתר כוללים מע"מ כדין.'
        : 'המחירים המוצגים באתר אינם כוללים מע"מ, אשר יתווסף לתשלום כדין.';
    }

    // spell out the actual times once the owner has set them
    const timesLine = $("#checkinTimesLine");
    if (timesLine && (info.checkinTime || info.checkoutTime)) {
      const parts = [];
      if (info.checkinTime) parts.push("הכניסה לוילה מהשעה " + info.checkinTime);
      if (info.checkoutTime) parts.push("היציאה עד השעה " + info.checkoutTime);
      timesLine.innerHTML =
        "<strong>שעות כניסה ויציאה:</strong> " +
        parts.join(", ") +
        ". שינוי בשעות מותנה בתיאום מראש, ואיחור ביציאה עלול לחייב בתשלום נוסף.";
    }

    if (box) {
      const rows = [];
      if (info.businessName) rows.push(["שם בעל העסק", info.businessName]);
      if (info.businessId) rows.push(["ח.פ. / ע.מ.", info.businessId]);
      if (info.businessAddress) rows.push(["כתובת", info.businessAddress]);
      if (info.contactPhone) rows.push(["טלפון", info.contactPhone]);
      box.innerHTML = rows
        .map(([label, value]) => `<div><strong>${label}:</strong> <span dir="auto">${value}</span></div>`)
        .join("");
    }
  }

  /* ---------------- Init ---------------- */
  buildA11yWidget();
  wireA11yWidget();
  // data.js declares `sb` with const, so it is script-scoped and never on window
  if (typeof loadLegalInfo === "function") renderLegalInfo();
})();
