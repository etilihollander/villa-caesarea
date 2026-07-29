/* ===================================================================
   Villa Caesarea — Shared data layer
   All content, images, pricing & availability live in localStorage so
   the admin panel and the public site stay in sync on this browser.
   =================================================================== */

const STORAGE_KEY = "villaSiteData_v1";

/* tiny non-cryptographic hash — good enough for a single-user demo
   admin login, NOT a substitute for real auth in production. */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
}

const IMAGES = [
  { file: "images/villa-06.jpg", tag: "hero" },
  { file: "images/villa-01.jpg", tag: "kitchen" },
  { file: "images/villa-02.jpg", tag: "kitchen" },
  { file: "images/villa-10.jpg", tag: "kitchen" },
  { file: "images/villa-04.jpg", tag: "dining" },
  { file: "images/villa-05.jpg", tag: "living" },
  { file: "images/villa-08.jpg", tag: "living" },
  { file: "images/villa-03.jpg", tag: "entrance" },
  { file: "images/villa-07.jpg", tag: "exterior" },
  { file: "images/villa-09.jpg", tag: "games" },
  { file: "images/villa-11.jpg", tag: "bedroom" },
  { file: "images/villa-12.jpg", tag: "bedroom" }
];

const DEFAULT_DATA = {
  admin: {
    username: "admin",
    passwordHash: simpleHash("caesarea2026")
  },
  contactEmail: "elad.hollander24@gmail.com",
  images: IMAGES,
  content: {
    en: {
      villaName: "Villa Caesarea",
      metaTitle: "Villa Caesarea — Private Luxury Villa Rental",
      tagline: "A private estate on Israel's coastline",
      location: "Caesarea, Israel",
      heroCta: "Check Availability",
      navHome: "Home",
      navAbout: "The Villa",
      navGallery: "Gallery",
      navAmenities: "Amenities",
      navAvailability: "Availability",
      navContact: "Enquire",
      introEyebrow: "Welcome to",
      introTitle: "An address of quiet luxury",
      introText:
        "Set behind private hedges in the heart of Caesarea, this contemporary estate blends clean architectural lines with warm, light-filled interiors. Floor-to-ceiling windows open onto a landscaped garden and pool terrace, while sun-washed living spaces flow seamlessly from the chef's kitchen to the formal dining room and beyond. Designed for effortless family gatherings and refined entertaining alike, the villa offers a rare balance of privacy, comfort and understated elegance just minutes from the Mediterranean.",
      quickFactsTitle: "At a glance",
      guestsLabel: "Guests",
      guests: "20",
      bedroomsLabel: "Bedrooms",
      bedrooms: "6",
      bathroomsLabel: "Bathrooms",
      bathrooms: "6",
      areaLabel: "Location",
      area: "Caesarea",
      galleryTitle: "Gallery",
      gallerySubtitle: "A glimpse inside the villa",
      amenitiesTitle: "Amenities",
      amenitiesSubtitle: "Everything the villa has to offer",
      amenities: [
        "Private swimming pool",
        "Fully equipped chef's kitchen",
        "Formal dining room, seats 10",
        "Game room with pool table & piano",
        "Landscaped private garden",
        "Smart TVs throughout",
        "High-speed WiFi",
        "Air conditioning throughout",
        "Private parking",
        "Alarm & security system",
        "Kids' play area",
        "Walking distance to beach"
      ],
      availabilityTitle: "Availability & Pricing",
      availabilitySubtitle:
        "Select a date to view nightly rates. Prices vary by season — the calendar below reflects real-time availability.",
      legendAvailable: "Available",
      legendClosed: "Not available",
      legendSelected: "Selected",
      minNightsLabel: "Minimum stay",
      nightsUnit: "nights",
      perNight: "/ night",
      fromLabel: "From",
      contactTitle: "Enquire About Your Stay",
      contactSubtitle:
        "Tell us your preferred dates and we'll get back to you shortly to confirm availability and finalize your booking.",
      formName: "Full name",
      formEmail: "Email",
      formPhone: "Phone",
      formCheckin: "Check-in",
      formCheckout: "Check-out",
      formGuests: "Number of guests",
      formMessage: "Message",
      formSubmit: "Send Enquiry",
      formSuccess: "Thank you — your enquiry has been prepared in your email client. We look forward to hosting you.",
      footerRights: "All rights reserved.",
      footerTagline: "Villa Caesarea — a private luxury rental",
      closedBadge: "Not available",
      selectDatesPrompt: "Select your check-in and check-out dates on the calendar above.",
      monthNames: ["January","February","March","April","May","June","July","August","September","October","November","December"],
      dayNames: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]
    },
    he: {
      villaName: "וילה קיסריה",
      metaTitle: "וילה קיסריה — להשכרה יוקרתית ופרטית",
      tagline: "אחוזה פרטית על חוף ישראל",
      location: "קיסריה, ישראל",
      heroCta: "בדיקת זמינות",
      navHome: "בית",
      navAbout: "הוילה",
      navGallery: "גלריה",
      navAmenities: "מתקנים",
      navAvailability: "זמינות",
      navContact: "יצירת קשר",
      introEyebrow: "ברוכים הבאים אל",
      introTitle: "כתובת של יוקרה שקטה",
      introText:
        "ממוקמת מאחורי גדר חיה פרטית בלב קיסריה, האחוזה העכשווית הזו משלבת קווים אדריכליים נקיים עם חללי פנים חמים ומוצפי אור. חלונות מרצפה עד תקרה נפתחים אל גינה מטופחת ומרפסת בריכה, בעוד שחללי המגורים השטופים בשמש זורמים בצורה חלקה מהמטבח השף אל חדר האוכל הפורמלי ומעבר לכך. מתוכננת הן למפגשי משפחה קלילים והן לאירוח מכובד, הוילה מציעה שילוב נדיר של פרטיות, נוחות ואלגנטיות מאופקת, במרחק דקות ספורות מחוף הים התיכון.",
      quickFactsTitle: "במבט מהיר",
      guestsLabel: "אורחים",
      guests: "20",
      bedroomsLabel: "חדרי שינה",
      bedrooms: "6",
      bathroomsLabel: "חדרי רחצה",
      bathrooms: "6",
      areaLabel: "מיקום",
      area: "קיסריה",
      galleryTitle: "גלריה",
      gallerySubtitle: "הצצה אל תוככי הוילה",
      amenitiesTitle: "מתקנים",
      amenitiesSubtitle: "כל מה שהוילה מציעה",
      amenities: [
        "בריכת שחייה פרטית",
        "מטבח שף מאובזר במלואו",
        "חדר אוכל פורמלי, מקום ל-10 סועדים",
        "חדר משחקים עם שולחן ביליארד ופסנתר",
        "גינה פרטית מטופחת",
        "טלוויזיות חכמות בכל הבית",
        "אינטרנט אלחוטי מהיר",
        "מיזוג אוויר בכל הבית",
        "חניה פרטית",
        "מערכת אזעקה ואבטחה",
        "פינת משחקים לילדים",
        "מרחק הליכה לחוף הים"
      ],
      availabilityTitle: "זמינות ומחירים",
      availabilitySubtitle:
        "בחרו תאריך כדי לצפות במחיר ללילה. המחירים משתנים בהתאם לעונה — היומן למטה משקף זמינות בזמן אמת.",
      legendAvailable: "פנוי",
      legendClosed: "לא זמין",
      legendSelected: "נבחר",
      minNightsLabel: "מינימום לילות",
      nightsUnit: "לילות",
      perNight: "/ ללילה",
      fromLabel: "החל מ-",
      contactTitle: "בירור זמינות ותאריכים",
      contactSubtitle:
        "ספרו לנו את התאריכים המועדפים עליכם ואנו נחזור אליכם בהקדם לאישור זמינות והשלמת ההזמנה.",
      formName: "שם מלא",
      formEmail: "אימייל",
      formPhone: "טלפון",
      formCheckin: "תאריך כניסה",
      formCheckout: "תאריך יציאה",
      formGuests: "מספר אורחים",
      formMessage: "הודעה",
      formSubmit: "שליחת פנייה",
      formSuccess: "תודה — הפנייה שלכם הוכנה בתוכנת הדוא\"ל שלכם. נשמח לארח אתכם.",
      footerRights: "כל הזכויות שמורות.",
      footerTagline: "וילה קיסריה — השכרת יוקרה פרטית",
      closedBadge: "לא זמין",
      selectDatesPrompt: "בחרו תאריך כניסה ותאריך יציאה בלוח השנה שלמעלה.",
      monthNames: ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"],
      dayNames: ["א'","ב'","ג'","ד'","ה'","ו'","ש'"]
    }
  },
  pricing: {
    currency: "ILS",
    currencySymbol: "₪",
    basePrice: 12000,
    minNights: 3,
    /* sparse map keyed by YYYY-MM-DD. Any date not listed uses basePrice
       and is considered open. */
    days: {}
  }
};

function seedSamplePricing(data) {
  // Seed a few illustrative overrides so the demo calendar isn't empty:
  // a closed maintenance week, and a higher summer-peak rate window.
  const days = data.pricing.days;
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();

  function fmt(d) {
    return d.toISOString().slice(0, 10);
  }
  function addDays(date, n) {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
  }

  // Close a maintenance window ~10 days from now for 3 days
  let d = addDays(today, 10);
  for (let i = 0; i < 3; i++) {
    days[fmt(addDays(d, i))] = { closed: true };
  }

  // Peak pricing window ~30-45 days from now
  let peakStart = addDays(today, 30);
  for (let i = 0; i < 15; i++) {
    days[fmt(addDays(peakStart, i))] = { price: 18000 };
  }

  // A lower shoulder-season window ~60-70 days from now
  let lowStart = addDays(today, 60);
  for (let i = 0; i < 10; i++) {
    days[fmt(addDays(lowStart, i))] = { price: 9500 };
  }

  return data;
}

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = seedSamplePricing(JSON.parse(JSON.stringify(DEFAULT_DATA)));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
  try {
    const parsed = JSON.parse(raw);
    // shallow-merge defaults for any keys added in later versions
    return {
      ...JSON.parse(JSON.stringify(DEFAULT_DATA)),
      ...parsed,
      content: {
        en: { ...DEFAULT_DATA.content.en, ...(parsed.content && parsed.content.en) },
        he: { ...DEFAULT_DATA.content.he, ...(parsed.content && parsed.content.he) }
      },
      pricing: {
        ...DEFAULT_DATA.pricing,
        ...(parsed.pricing || {}),
        days: (parsed.pricing && parsed.pricing.days) || {}
      }
    };
  } catch (e) {
    console.error("Corrupt villa data, resetting to defaults", e);
    const seeded = seedSamplePricing(JSON.parse(JSON.stringify(DEFAULT_DATA)));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function resetData() {
  localStorage.removeItem(STORAGE_KEY);
  return loadData();
}

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
