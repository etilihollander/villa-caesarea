/* ===================================================================
   Villa Caesarea — Shared data layer (Supabase-backed)
   All content, images, pricing & availability live in Supabase so the
   admin panel and the public site stay in sync across every device.
   Requires js/config.js (SUPABASE_URL / SUPABASE_ANON_KEY) and the
   supabase-js CDN script to be loaded before this file.
   =================================================================== */

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ---------------- Date helpers (pure, no network) ---------------- */

function fmtDateKey(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getDayInfo(data, dateKey) {
  const override = data.pricing.days[dateKey];
  const price = (override && override.price) || data.pricing.basePrice;
  const closed = !!(override && override.closed);
  return { price, closed };
}

/* ---------------- Load everything from Supabase ---------------- */

async function loadData() {
  const [{ data: contentRow, error: contentErr }, { data: images, error: imagesErr }, { data: days, error: daysErr }] =
    await Promise.all([
      sb.from("site_content").select("*").eq("id", 1).single(),
      sb.from("villa_images").select("*").order("sort_order", { ascending: true }),
      sb.from("calendar_days").select("*")
    ]);

  if (contentErr) throw contentErr;
  if (imagesErr) throw imagesErr;
  if (daysErr) throw daysErr;

  const dayMap = {};
  (days || []).forEach((row) => {
    dayMap[row.day] = { price: row.price || undefined, closed: !!row.closed };
  });

  // hero image first, then the rest in sort_order
  const sortedImages = [...(images || [])];
  sortedImages.sort((a, b) => (b.is_hero === true) - (a.is_hero === true) || a.sort_order - b.sort_order);

  return {
    contactEmail: contentRow.contact_email,
    contactPhone: contentRow.contact_phone || "",
    contactInstagram: contentRow.contact_instagram || "",
    businessName: contentRow.business_name || "",
    businessId: contentRow.business_id || "",
    businessAddress: contentRow.business_address || "",
    vatIncluded: contentRow.vat_included !== false,
    checkinTime: contentRow.checkin_time || "",
    checkoutTime: contentRow.checkout_time || "",
    content: {
      en: contentRow.content_en,
      he: contentRow.content_he
    },
    images: sortedImages.map((img) => ({ id: img.id, file: img.url, tag: img.tag, isHero: img.is_hero, isAbout: img.is_about, isHidden: !!img.is_hidden })),
    pricing: {
      currency: "ILS",
      currencySymbol: contentRow.currency_symbol,
      basePrice: Number(contentRow.base_price),
      minNights: contentRow.min_nights,
      // base price covers up to guestsIncluded; each guest beyond that adds
      // extraGuestFee per night
      guestsIncluded: Number(contentRow.guests_included) || 0,
      extraGuestFee: Number(contentRow.extra_guest_fee) || 0,
      days: dayMap
    }
  };
}

/* ---------------- Content & settings writes (admin only) ---------------- */

async function updateContent(lang, contentObj) {
  const column = lang === "he" ? "content_he" : "content_en";
  const { error } = await sb
    .from("site_content")
    .update({ [column]: contentObj, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) throw error;
}

async function updateSettings({
  basePrice, minNights, contactEmail, contactPhone, contactInstagram,
  businessName, businessId, businessAddress, vatIncluded,
  guestsIncluded, extraGuestFee, checkinTime, checkoutTime
}) {
  const { error } = await sb
    .from("site_content")
    .update({
      base_price: basePrice,
      min_nights: minNights,
      contact_email: contactEmail,
      contact_phone: contactPhone ?? "",
      contact_instagram: contactInstagram ?? "",
      business_name: businessName ?? "",
      business_id: businessId ?? "",
      business_address: businessAddress ?? "",
      vat_included: vatIncluded !== false,
      guests_included: guestsIncluded ?? 0,
      extra_guest_fee: extraGuestFee ?? 0,
      checkin_time: checkinTime ?? "",
      checkout_time: checkoutTime ?? "",
      updated_at: new Date().toISOString()
    })
    .eq("id", 1);
  if (error) throw error;
}

/* Business identity for the legal pages — a lightweight public read used by
   privacy.html / terms.html, which do not load the full site data layer. */
async function loadLegalInfo() {
  const { data, error } = await sb
    .from("site_content")
    .select("business_name, business_id, business_address, contact_email, contact_phone, vat_included, checkin_time, checkout_time")
    .eq("id", 1)
    .single();
  if (error) throw error;
  return {
    businessName: data.business_name || "",
    businessId: data.business_id || "",
    businessAddress: data.business_address || "",
    contactEmail: data.contact_email || "",
    contactPhone: data.contact_phone || "",
    vatIncluded: data.vat_included !== false,
    checkinTime: data.checkin_time || "",
    checkoutTime: data.checkout_time || ""
  };
}

/* ---------------- Calendar writes (admin only) ---------------- */

function eachDateKeyInRange(startKey, endKey) {
  const keys = [];
  let cursor = new Date(startKey);
  const end = new Date(endKey || startKey);
  while (cursor <= end) {
    keys.push(fmtDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}

async function setCalendarPriceRange(startKey, endKey, price) {
  const rows = eachDateKeyInRange(startKey, endKey).map((day) => ({ day, price, closed: false }));
  const { error } = await sb.from("calendar_days").upsert(rows, { onConflict: "day" });
  if (error) throw error;
}

async function setCalendarClosedRange(startKey, endKey, closed) {
  const keys = eachDateKeyInRange(startKey, endKey);
  // upsert while preserving any existing price on those days
  const { data: existing, error: fetchErr } = await sb.from("calendar_days").select("*").in("day", keys);
  if (fetchErr) throw fetchErr;
  const existingMap = {};
  (existing || []).forEach((r) => (existingMap[r.day] = r));
  const rows = keys.map((day) => ({
    day,
    price: existingMap[day] ? existingMap[day].price : null,
    closed
  }));
  const { error } = await sb.from("calendar_days").upsert(rows, { onConflict: "day" });
  if (error) throw error;
}

/* ---------------- Image writes (admin only) ---------------- */

async function addImageRow(url, tag) {
  const { data: maxRow } = await sb
    .from("villa_images")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = maxRow ? maxRow.sort_order + 1 : 0;
  const { data, error } = await sb
    .from("villa_images")
    .insert({ url, tag, sort_order: nextOrder })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/* Resize/compress in the browser and push the file to Supabase Storage,
   returning its public URL. Used both by the villa gallery (which also keeps a
   villa_images row) and by the celebrations page (which stores plain URLs
   inside its own content document). */
async function uploadImageToStorage(file, folder) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const maxW = 1800;
          const scale = Math.min(1, maxW / img.width);
          const canvas = document.createElement("canvas");
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(
            async (blob) => {
              try {
                const dir = folder || "uploads";
                const path = `${dir}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
                const { error: upErr } = await sb.storage.from("villa-images").upload(path, blob, {
                  contentType: "image/jpeg",
                  upsert: false
                });
                if (upErr) throw upErr;
                const { data: pub } = sb.storage.from("villa-images").getPublicUrl(path);
                resolve(pub.publicUrl);
              } catch (e) {
                reject(e);
              }
            },
            "image/jpeg",
            0.85
          );
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = reject;
      img.src = ev.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function uploadImageFile(file) {
  const url = await uploadImageToStorage(file, "uploads");
  return addImageRow(url, "custom");
}

/* Best-effort removal of a file we uploaded ourselves. Images that live in the
   repo's images/ folder are served by Netlify and are left alone. */
async function removeStorageImage(url) {
  if (!url || !url.includes("/storage/v1/object/public/villa-images/")) return;
  const path = url.split("/villa-images/")[1];
  if (path) await sb.storage.from("villa-images").remove([path]);
}

async function deleteImageRow(id, url) {
  const { error } = await sb.from("villa_images").delete().eq("id", id);
  if (error) throw error;
  // best-effort: also remove from storage if it was an admin-uploaded file
  await removeStorageImage(url);
}

// multiple images can be part of the home slideshow at once
async function toggleHeroImage(id, isHero) {
  const { error } = await sb.from("villa_images").update({ is_hero: isHero }).eq("id", id);
  if (error) throw error;
}

async function updateImageTag(id, tag) {
  const { error } = await sb.from("villa_images").update({ tag }).eq("id", id);
  if (error) throw error;
}

async function updateImageHidden(id, isHidden) {
  const { error } = await sb.from("villa_images").update({ is_hidden: isHidden }).eq("id", id);
  if (error) throw error;
}

// only one image can be the villa/about-section image at a time
async function setAboutImage(id) {
  const { error: clearErr } = await sb.from("villa_images").update({ is_about: false }).eq("is_about", true);
  if (clearErr) throw clearErr;
  const { error } = await sb.from("villa_images").update({ is_about: true }).eq("id", id);
  if (error) throw error;
}

/* ---------------- Finance panel (admin only) ---------------- */

async function loadFinanceSettings() {
  const { data, error } = await sb.from("finance_settings").select("*").eq("id", 1).single();
  if (error) throw error;
  return {
    // used to seed a month that has no operational-cost entry of its own yet
    defaultOperationalCosts: data.operational_costs || [],
    fixedCosts: data.fixed_costs || [],
    forecastNights: data.forecast_nights || [],
    forecastPrices: data.forecast_prices || []
  };
}

async function updateFinanceSettings({ fixedCosts, forecastNights, forecastPrices }) {
  const { error } = await sb
    .from("finance_settings")
    .update({
      fixed_costs: fixedCosts,
      forecast_nights: forecastNights,
      forecast_prices: forecastPrices,
      updated_at: new Date().toISOString()
    })
    .eq("id", 1);
  if (error) throw error;
}

/* ---------------- Monthly operational costs (admin only) ---------------- */

// Returns null when the month has no entry of its own yet (caller should
// fall back to defaultOperationalCosts from loadFinanceSettings).
async function loadMonthlyOperationalCosts(month) {
  const { data, error } = await sb.from("monthly_operational_costs").select("costs").eq("month", month).maybeSingle();
  if (error) throw error;
  return data ? data.costs : null;
}

async function setMonthlyOperationalCosts(month, costs) {
  const { error } = await sb
    .from("monthly_operational_costs")
    .upsert({ month, costs, updated_at: new Date().toISOString() }, { onConflict: "month" });
  if (error) throw error;
}

// Actual bookings are derived from calendar days marked "closed" in the
// admin calendar — the site has no separate reservations table, so this is
// the closest proxy to real bookings, grouped by year and by month.
async function loadActualBookingStats(basePrice) {
  const { data: days, error } = await sb.from("calendar_days").select("day, price, closed").eq("closed", true);
  if (error) throw error;
  const byYear = {};
  const byMonth = {};
  (days || []).forEach((row) => {
    const year = row.day.slice(0, 4);
    const month = row.day.slice(0, 7); // "YYYY-MM"
    const income = Number(row.price) || basePrice;
    if (!byYear[year]) byYear[year] = { nights: 0, income: 0 };
    byYear[year].nights += 1;
    byYear[year].income += income;
    if (!byMonth[month]) byMonth[month] = { nights: 0, income: 0 };
    byMonth[month].nights += 1;
    byMonth[month].income += income;
  });
  return { byYear, byMonth };
}

/* ---------------- Enquiries (admin only) ---------------- */

async function loadEnquiries() {
  const { data, error } = await sb.from("enquiries").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

async function markEnquiryRead(id, isRead) {
  const { error } = await sb.from("enquiries").update({ is_read: isRead }).eq("id", id);
  if (error) throw error;
}

async function deleteEnquiry(id) {
  const { error } = await sb.from("enquiries").delete().eq("id", id);
  if (error) throw error;
}

/* ===================================================================
   Celebrations page ("אירועים חגיגיים בווילה")

   The whole page — headings, paragraphs, category list and order, every
   gallery, the homepage promo box and the SEO strings — is one jsonb
   document in public.celebrations_content (single row, id = 1), with the
   same RLS as site_content: public read, authenticated write.

   Per-language text sits in `he` / `en` sub-objects *inside* each node, so
   structure (which categories exist, their order, their photos) is shared
   between the two languages and can never drift apart.
   =================================================================== */

const CELEBRATION_LANGS = ["he", "en"];

function celText(value) {
  return typeof value === "string" ? value : "";
}

function celLangPair(raw, keys) {
  const src = raw && typeof raw === "object" ? raw : {};
  const out = {};
  CELEBRATION_LANGS.forEach((lang) => {
    const node = src[lang] && typeof src[lang] === "object" ? src[lang] : {};
    out[lang] = {};
    keys.forEach((k) => (out[lang][k] = celText(node[k])));
  });
  return out;
}

// an image is { url, alt: { he, en } } — a bare string is accepted too
function celImage(raw) {
  if (typeof raw === "string") return { url: raw, alt: { he: "", en: "" } };
  const src = raw && typeof raw === "object" ? raw : {};
  const alt = src.alt && typeof src.alt === "object" ? src.alt : {};
  return {
    url: celText(src.url),
    alt: { he: celText(alt.he), en: celText(alt.en) }
  };
}

function celSlug(value, fallback) {
  const slug = celText(value)
    .trim()
    .toLowerCase()
    .replace(/[^\w֐-׿-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}

/* Fills in anything a hand-edited or older document is missing, so neither the
   public page nor the admin panel ever has to guard against absent keys. */
function normalizeCelebrations(raw) {
  const doc = raw && typeof raw === "object" ? raw : {};
  const why = doc.why && typeof doc.why === "object" ? doc.why : {};
  const promo = doc.promo && typeof doc.promo === "object" ? doc.promo : {};

  return {
    version: 1,
    // the label of the new item in the site's main navigation
    nav: {
      he: celText(doc.nav && doc.nav.he),
      en: celText(doc.nav && doc.nav.en)
    },
    seo: celLangPair(doc.seo, ["title", "description"]),
    hero: Object.assign({ image: celImage(doc.hero && doc.hero.image) }, celLangPair(doc.hero, ["eyebrow", "title", "intro"])),
    notice: {
      he: celText(doc.notice && doc.notice.he),
      en: celText(doc.notice && doc.notice.en)
    },
    categoriesHead: celLangPair(doc.categoriesHead, ["eyebrow", "title", "desc"]),
    categories: (Array.isArray(doc.categories) ? doc.categories : []).map((cat, i) => {
      const src = cat && typeof cat === "object" ? cat : {};
      return Object.assign(
        {
          id: celSlug(src.id, "category-" + (i + 1)),
          hidden: src.hidden === true,
          image: celImage(src.image),
          gallery: (Array.isArray(src.gallery) ? src.gallery : []).map(celImage).filter((img) => img.url)
        },
        celLangPair(src, ["title", "desc"])
      );
    }),
    why: Object.assign(celLangPair(why, ["eyebrow", "title", "desc"]), {
      items: (Array.isArray(why.items) ? why.items : []).map((item, i) => {
        const src = item && typeof item === "object" ? item : {};
        return Object.assign(
          { id: celSlug(src.id, "item-" + (i + 1)), icon: celText(src.icon) },
          celLangPair(src, ["title", "desc"])
        );
      })
    }),
    cta: celLangPair(doc.cta, ["eyebrow", "title", "desc", "button", "secondaryButton", "whatsappMessage", "note"]),
    promo: Object.assign(
      { enabled: promo.enabled !== false, image: celImage(promo.image) },
      celLangPair(promo, ["eyebrow", "title", "desc", "button"])
    )
  };
}

async function loadCelebrations() {
  const { data, error } = await sb.from("celebrations_content").select("data").eq("id", 1).maybeSingle();
  if (error) throw error;
  return normalizeCelebrations(data ? data.data : null);
}

async function updateCelebrations(doc) {
  const { error } = await sb
    .from("celebrations_content")
    .upsert({ id: 1, data: normalizeCelebrations(doc), updated_at: new Date().toISOString() }, { onConflict: "id" });
  if (error) throw error;
}

/* ---------------- Auth (admin login) ---------------- */

async function adminSignIn(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function adminSignOut() {
  await sb.auth.signOut();
}

async function getAdminSession() {
  const { data } = await sb.auth.getSession();
  return data.session;
}

async function changeAdminPassword(newPassword) {
  const { error } = await sb.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

/* ---------------- Realtime: keep the public site live ---------------- */

function subscribeToVillaChanges(onChange) {
  const channel = sb
    .channel("villa-public-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "site_content" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "calendar_days" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "villa_images" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "enquiries" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "celebrations_content" }, onChange)
    .subscribe();
  return () => sb.removeChannel(channel);
}
