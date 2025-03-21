// حفظ الإعدادات في localStorage
const settings = {
  theme: localStorage.getItem("theme") || "dark",
  timeFormat: localStorage.getItem("timeFormat") || "24",
  location: JSON.parse(localStorage.getItem("location")) || null,
};

// تطبيق الإعدادات المحفوظة
function applySettings() {
  document.body.classList.toggle("light-mode", settings.theme === "light");
  updateThemeButtons();
  updateTimeFormatButtons();
}

// تحديث أزرار المظهر
function updateThemeButtons() {
  document.querySelectorAll(".theme-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.theme === settings.theme);
  });
}

// تحديث أزرار نظام الساعة
function updateTimeFormatButtons() {
  document.querySelectorAll(".time-format-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.format === settings.timeFormat);
  });
}

// تحويل الوقت إلى نظام 12 ساعة
function convertTo12Hour(time) {
  if (settings.timeFormat === "24") return time;
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? "م" : "ص";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

// تحويل الوقت إلى نظام 24 ساعة
function convertTo24Hour(time) {
  if (settings.timeFormat === "24") return time;
  const [timeStr, period] = time.split(" ");
  const [hours, minutes] = timeStr.split(":");
  let hour = parseInt(hours);
  if (period === "م" && hour !== 12) hour += 12;
  if (period === "ص" && hour === 12) hour = 0;
  return `${hour.toString().padStart(2, "0")}:${minutes}`;
}

// الحصول على موقع المستخدم
function getLocation() {
  if (settings.location) {
    getPrayerTimes(settings.location.lat, settings.location.lon);
    document.getElementById("city").textContent = settings.location.name;
    return;
  }

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        getPrayerTimes(latitude, longitude);
        getCityName(latitude, longitude);
      },
      (error) => {
        console.error("خطأ في الحصول على الموقع:", error);
        document.getElementById("city").textContent = "لم يتم تحديد الموقع";
      }
    );
  } else {
    document.getElementById("city").textContent = "متصفحك لا يدعم تحديد الموقع";
  }
}

// الحصول على اسم المدينة من الإحداثيات
async function getCityName(latitude, longitude) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
    );
    const data = await response.json();
    const cityName =
      data.address.city ||
      data.address.town ||
      data.address.village ||
      "موقع غير معروف";
    document.getElementById("city").textContent = cityName;
    settings.location = {
      lat: latitude,
      lon: longitude,
      name: cityName,
    };
    localStorage.setItem("location", JSON.stringify(settings.location));
  } catch (error) {
    console.error("خطأ في الحصول على اسم المدينة:", error);
    document.getElementById("city").textContent = "موقع غير معروف";
  }
}

// الحصول على مواقيت الصلاة
async function getPrayerTimes(latitude, longitude) {
  try {
    const response = await fetch(
      `https://api.aladhan.com/v1/timings/${Math.floor(
        Date.now() / 1000
      )}?latitude=${latitude}&longitude=${longitude}&method=4`
    );
    const data = await response.json();

    if (data.code === 200) {
      const timings = data.data.timings;
      updatePrayerTimes(timings);
      updateNextPrayer(timings);
    }
  } catch (error) {
    console.error("خطأ في الحصول على مواقيت الصلاة:", error);
  }
}

// تحديث مواقيت الصلاة في الواجهة
function updatePrayerTimes(timings) {
  const prayers = {
    Fajr: "fajr",
    Sunrise: "sunrise",
    Dhuhr: "dhuhr",
    Asr: "asr",
    Maghrib: "maghrib",
    Isha: "isha",
  };

  for (const [prayer, id] of Object.entries(prayers)) {
    const element = document.getElementById(id);
    if (element) {
      element.querySelector(".time").textContent = convertTo12Hour(
        timings[prayer]
      );
    }
  }
}

// تحديث الصلاة القادمة
function updateNextPrayer(timings) {
  const prayers = [
    { name: "الفجر", time: timings.Fajr },
    { name: "الشروق", time: timings.Sunrise },
    { name: "الظهر", time: timings.Dhuhr },
    { name: "العصر", time: timings.Asr },
    { name: "المغرب", time: timings.Maghrib },
    { name: "العشاء", time: timings.Isha },
  ];

  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  let nextPrayer = prayers[0];
  let minTimeDiff = Infinity;

  for (const prayer of prayers) {
    const [hours, minutes] = convertTo24Hour(prayer.time)
      .split(":")
      .map(Number);
    const prayerTime = hours * 60 + minutes;
    let timeDiff = prayerTime - currentTime;

    if (timeDiff < 0) {
      timeDiff += 24 * 60;
    }

    if (timeDiff < minTimeDiff) {
      minTimeDiff = timeDiff;
      nextPrayer = prayer;
    }
  }

  document.getElementById("next-prayer-name").textContent = nextPrayer.name;
  document.getElementById("next-prayer-time").textContent = convertTo12Hour(
    nextPrayer.time
  );

  // تحديث الوقت المتبقي
  updateTimeRemaining(minTimeDiff);
}

// تحديث الوقت المتبقي
function updateTimeRemaining(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  let timeText = "";

  if (hours > 0) {
    timeText += `${hours} ساعة `;
  }
  if (mins > 0 || hours === 0) {
    timeText += `${mins} دقيقة`;
  }

  document.getElementById("time-remaining").textContent = `متبقي: ${timeText}`;
}

// البحث عن موقع
async function searchLocation(query) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query
      )}`
    );
    const data = await response.json();
    displaySearchResults(data);
  } catch (error) {
    console.error("خطأ في البحث عن الموقع:", error);
  }
}

// عرض نتائج البحث
function displaySearchResults(results) {
  const searchResults = document.getElementById("search-results");
  searchResults.innerHTML = "";

  results.forEach((result) => {
    const div = document.createElement("div");
    div.className = "search-result-item";
    div.textContent = result.display_name;
    div.addEventListener("click", () => selectLocation(result));
    searchResults.appendChild(div);
  });
}

// اختيار موقع
function selectLocation(location) {
  settings.location = {
    lat: parseFloat(location.lat),
    lon: parseFloat(location.lon),
    name: location.display_name,
  };
  localStorage.setItem("location", JSON.stringify(settings.location));
  document.getElementById("city").textContent = location.display_name;
  document.getElementById("search-results").innerHTML = "";
  document.getElementById("location-search").value = "";
  getPrayerTimes(location.lat, location.lon);
}

// إعدادات نافذة الإعدادات
function setupSettingsModal() {
  const modal = document.getElementById("settings-modal");
  const settingsBtn = document.getElementById("settings-btn");
  const closeBtn = modal.querySelector(".close-btn");
  const themeBtns = document.querySelectorAll(".theme-btn");
  const timeFormatBtns = document.querySelectorAll(".time-format-btn");
  const searchInput = document.getElementById("location-search");
  const searchBtn = document.getElementById("search-btn");

  settingsBtn.addEventListener("click", () => {
    modal.classList.add("active");
  });

  closeBtn.addEventListener("click", () => {
    modal.classList.remove("active");
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.classList.remove("active");
    }
  });

  themeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      settings.theme = btn.dataset.theme;
      localStorage.setItem("theme", settings.theme);
      applySettings();
    });
  });

  timeFormatBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      settings.timeFormat = btn.dataset.format;
      localStorage.setItem("timeFormat", settings.timeFormat);
      applySettings();
      // تحديث المواقيت المعروضة
      const cityElement = document.getElementById("city");
      if (cityElement.textContent !== "جاري تحديد الموقع...") {
        getLocation();
      }
    });
  });

  searchBtn.addEventListener("click", () => {
    const query = searchInput.value.trim();
    if (query) {
      searchLocation(query);
    }
  });

  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      const query = searchInput.value.trim();
      if (query) {
        searchLocation(query);
      }
    }
  });
}

// تحديث البيانات كل دقيقة
function startUpdates() {
  getLocation();
  setInterval(() => {
    const cityElement = document.getElementById("city");
    if (cityElement.textContent !== "جاري تحديد الموقع...") {
      getLocation();
    }
  }, 60000);

  // تحديث الوقت المتبقي كل دقيقة
  setInterval(() => {
    const cityElement = document.getElementById("city");
    if (cityElement.textContent !== "جاري تحديد الموقع...") {
      getPrayerTimes(settings.location.lat, settings.location.lon);
    }
  }, 60000);
}

// بدء التطبيق
applySettings();
setupSettingsModal();
startUpdates();
