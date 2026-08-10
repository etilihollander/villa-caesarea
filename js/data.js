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
    content: {
      en: contentRow.content_en,
      he: contentRow.content_he
    },
    images: sortedImages.map((img) => ({ id: img.id, file: img.url, tag: img.tag, isHero: img.is_hero, isAbout: img.is_about })),
    pricing: {
      currency: "ILS",
      currencySymbol: contentRow.currency_symbol,
      basePrice: Number(contentRow.base_price),
      minNights: contentRow.min_nights,
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

async function updateSettings({ basePrice, minNights, contactEmail }) {
  const { error } = await sb
    .from("site_content")
    .update({
      base_price: basePrice,
      min_nights: minNights,
      contact_email: contactEmail,
      updated_at: new Date().toISOString()
    })
    .eq("id", 1);
  if (error) throw error;
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

async function uploadImageFile(file) {
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
                const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
                const { error: upErr } = await sb.storage.from("villa-images").upload(path, blob, {
                  contentType: "image/jpeg",
                  upsert: false
                });
                if (upErr) throw upErr;
                const { data: pub } = sb.storage.from("villa-images").getPublicUrl(path);
                const row = await addImageRow(pub.publicUrl, "custom");
                resolve(row);
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

async function deleteImageRow(id, url) {
  const { error } = await sb.from("villa_images").delete().eq("id", id);
  if (error) throw error;
  // best-effort: also remove from storage if it was an admin-uploaded file
  if (url && url.includes("/storage/v1/object/public/villa-images/")) {
    const path = url.split("/villa-images/")[1];
    if (path) await sb.storage.from("villa-images").remove([path]);
  }
}

// multiple images can be part of the home slideshow at once
async function toggleHeroImage(id, isHero) {
  const { error } = await sb.from("villa_images").update({ is_hero: isHero }).eq("id", id);
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
    .subscribe();
  return () => sb.removeChannel(channel);
}
