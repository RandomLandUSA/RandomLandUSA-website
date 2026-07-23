import { supabase } from "./supabase-client.js";

const elements = {
  statusText: document.getElementById("status-text"),
  newButton: document.getElementById("new-generator-button"),
  signOutButton: document.getElementById("sign-out-button"),

  availableCount: document.getElementById("available-count"),
  reservedCount: document.getElementById("reserved-count"),
  rentedCount: document.getElementById("rented-count"),
  maintenanceCount: document.getElementById("maintenance-count"),
  totalCount: document.getElementById("total-count"),

  searchInput: document.getElementById("search-input"),
  statusFilter: document.getElementById("status-filter"),
  visibleCount: document.getElementById("visible-count"),
  generatorGrid: document.getElementById("generator-grid"),
  emptyState: document.getElementById("empty-state"),
rentalRequestList: document.getElementById(
  "rental-request-list"
),
  bookingCalendar: document.getElementById("booking-calendar"),
  calendarMonthLabel: document.getElementById("calendar-month-label"),
  calendarPrevious: document.getElementById("calendar-previous"),
  calendarToday: document.getElementById("calendar-today"),
  calendarNext: document.getElementById("calendar-next"),
  availabilityModal: document.getElementById("availability-modal"),
  availabilityTitle: document.getElementById("availability-title"),
  availabilitySummary: document.getElementById("availability-summary"),
  availabilityTimeline: document.getElementById("availability-timeline"),
  modal: document.getElementById("generator-modal"),
  form: document.getElementById("generator-form"),
  formTitle: document.getElementById("form-title"),
  formMessage: document.getElementById("form-message"),
  saveButton: document.getElementById("save-button"),

  idInput: document.getElementById("generator-id"),
  nameInput: document.getElementById("name"),
  manufacturerInput: document.getElementById("manufacturer"),
  modelInput: document.getElementById("model"),
  fuelTypeInput: document.getElementById("fuel-type"),
  hoursInput: document.getElementById("hours"),
  generatorStatusInput: document.getElementById("generator-status"),
  locationInput: document.getElementById("location"),
  dailyRateInput: document.getElementById("daily-rate"),
  weekendRateInput: document.getElementById("weekend-rate"),
    weeklyRateInput: document.getElementById("weekly-rate"),
  descriptionInput: document.getElementById("description"),
  imageInput: document.getElementById("generator-image"),
  imagePreviewList: document.getElementById("image-preview-list"),
  assetTagInput: document.getElementById("asset-tag"),
serialNumberInput: document.getElementById("serial-number"),
kwRatingInput: document.getElementById("kw-rating"),
runningWattsInput: document.getElementById("running-watts"),
startingWattsInput: document.getElementById("starting-watts"),
fuelCapacityInput: document.getElementById("fuel-capacity"),
weightLbsInput: document.getElementById("weight-lbs"),
customSpecsList: document.getElementById("custom-specs-list"),
addCustomSpecButton: document.getElementById("add-custom-spec-button"),
};

let generators = [];
let selectedImages = [];
let currentImageUrl = null;
let currentGeneratorImageUrls = [];
let rentalRequests = [];
let calendarMonth = startOfMonth(new Date());

initialize();

async function initialize() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error(error);
    elements.statusText.textContent = "Unable to verify your login.";
    return;
  }

  if (!data.session) {
    window.location.href = "../index.html";
    return;
  }

 connectEventListeners();

await loadGenerators();

elements.addCustomSpecButton.addEventListener("click", () => {
  addCustomSpecRow();
});
}

function connectEventListeners() {
  elements.newButton.addEventListener("click", openAddForm);

  elements.signOutButton.addEventListener("click", signOut);

  elements.searchInput.addEventListener("input", applyFilters);
  elements.statusFilter.addEventListener("change", applyFilters);

elements.generatorGrid.addEventListener("click", handleCardAction);

elements.rentalRequestList.addEventListener(
    "click",
    handleRentalRequestAction
);

elements.calendarPrevious.addEventListener("click", () => {
  calendarMonth = addMonths(calendarMonth, -1);
  renderBookingCalendar();
});

elements.calendarToday.addEventListener("click", () => {
  calendarMonth = startOfMonth(new Date());
  renderBookingCalendar();
});

elements.calendarNext.addEventListener("click", () => {
  calendarMonth = addMonths(calendarMonth, 1);
  renderBookingCalendar();
});

elements.form.addEventListener("submit", saveGenerator);

 elements.imageInput.addEventListener("change", (event) => {
  selectedImages = Array.from(event.target.files ?? []);
  renderSelectedImagePreviews();
});

  document.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", closeModal);
  });

  document
    .querySelectorAll("[data-close-availability]")
    .forEach((button) => {
      button.addEventListener("click", closeAvailabilityModal);
    });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }

    if (!elements.availabilityModal.hidden) {
      closeAvailabilityModal();
      return;
    }

    if (!elements.modal.hidden) {
      closeModal();
    }
  });
}

async function loadGenerators() {
  elements.statusText.textContent = "Loading inventory...";

  const { data, error } = await supabase
    .from("generators")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error(error);
    elements.statusText.textContent = `Error: ${error.message}`;
    return;
  }

  generators = data ?? [];

  updateStatistics();
  applyFilters();
  await loadRentalRequests();
  elements.statusText.textContent =
    `${generators.length} generator${generators.length === 1 ? "" : "s"} in inventory.`;
}

function updateStatistics() {
  const counts = {
    Available: 0,
    Reserved: 0,
    Rented: 0,
    Maintenance: 0,
  };

  generators.forEach((generator) => {
    const status = normalizeStatus(generator.status);

    if (Object.hasOwn(counts, status)) {
      counts[status] += 1;
    }
  });

  elements.availableCount.textContent = counts.Available;
  elements.reservedCount.textContent = counts.Reserved;
  elements.rentedCount.textContent = counts.Rented;
  elements.maintenanceCount.textContent = counts.Maintenance;
  elements.totalCount.textContent = generators.length;
}

function applyFilters() {
  const query = elements.searchInput.value.trim().toLowerCase();
  const selectedStatus = elements.statusFilter.value;

  const filteredGenerators = generators.filter((generator) => {
    const searchableText = [
      generator.name,
      generator.manufacturer,
      generator.model,
      generator.fuel_type,
      generator.location,
      generator.description,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch =
      query.length === 0 || searchableText.includes(query);

    const generatorStatus = normalizeStatus(generator.status);

    const matchesStatus =
      selectedStatus === "All" ||
      generatorStatus === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  renderGenerators(filteredGenerators);
}

function renderGenerators(filteredGenerators) {
  elements.visibleCount.textContent =
    `Showing ${filteredGenerators.length} of ${generators.length}`;

  elements.emptyState.hidden = filteredGenerators.length !== 0;

  if (filteredGenerators.length === 0) {
    elements.generatorGrid.innerHTML = "";
    return;
  }

  elements.generatorGrid.innerHTML = filteredGenerators
    .map(createGeneratorCard)
    .join("");
}

function createGeneratorCard(generator) {
  const name = escapeHtml(generator.name || "Unnamed Generator");
  const manufacturer = escapeHtml(generator.manufacturer || "Unknown manufacturer");
  const model = escapeHtml(generator.model || "Model not entered");
  const fuelType = escapeHtml(generator.fuel_type || "Not entered");
  const location = escapeHtml(generator.location || "Location not entered");
  const description = escapeHtml(generator.description || "");
  const status = normalizeStatus(generator.status);
  const statusClass = status.toLowerCase();

 const imageUrls = Array.isArray(generator.image_urls)
  ? generator.image_urls.filter(Boolean)
  : [];

const allImageUrls = imageUrls.length
  ? imageUrls
  : generator.image_url
    ? [generator.image_url]
    : [];

const imageMarkup = allImageUrls.length
  ? `
    <div class="generator-image-gallery">
      ${allImageUrls
        .map(
          (url) => `
            <img
              class="generator-image"
              src="${escapeHtml(url)}"
              alt="${name}"
            >
          `
        )
        .join("")}
    </div>
  `
  : `
    <div class="generator-placeholder">
      No photo
    </div>
  `;

  const descriptionMarkup = description
    ? `<p class="generator-description">${description}</p>`
    : "";
const customSpecs = Array.isArray(generator.custom_specs)
  ? generator.custom_specs
  : [];

const allSpecs = [
  {
    label: "Running watts",
    value:
      generator.running_watts !== null &&
      generator.running_watts !== undefined
        ? `${generator.running_watts} W`
        : null,
  },
  {
    label: "Starting watts",
    value:
      generator.starting_watts !== null &&
      generator.starting_watts !== undefined
        ? `${generator.starting_watts} W`
        : null,
  },
  {
    label: "Fuel capacity",
    value:
      generator.fuel_capacity_gallons !== null &&
      generator.fuel_capacity_gallons !== undefined
        ? `${generator.fuel_capacity_gallons} gal`
        : null,
  },
  
  {
    label: "Weight",
    value:
      generator.weight_lbs !== null &&
      generator.weight_lbs !== undefined
        ? `${generator.weight_lbs} lbs`
        : null,
  },
  ...customSpecs.map((spec) => ({
    label: spec.label || "Specification",
    value: spec.value || "—",
  })),
].filter((spec) => spec.value !== null && spec.value !== "");

const customSpecsMarkup = allSpecs.length
  ? `
    <div class="custom-specs-display">
      <strong>Specifications</strong>

      <ul>
        ${allSpecs
          .map(
            (spec) => `
              <li>
                <span>${escapeHtml(spec.label)}</span>
                <strong>${escapeHtml(String(spec.value))}</strong>
              </li>
            `
          )
          .join("")}
      </ul>
    </div>
  `
  : "";
  return `
    <article class="generator-card">
      <div class="generator-image-wrap">
        ${imageMarkup}
      </div>

      <div class="generator-card-body">
        <div class="generator-card-heading">
          <div>
            <h3>${name}</h3>
            <p class="generator-subtitle">${manufacturer} · ${model}</p>
          </div>

          <span class="status-badge status-${statusClass}">
            ${escapeHtml(status)}
          </span>
        </div>

        <div class="price-grid">
          <div class="price-item">
            <span class="price-label">Daily</span>
            <span class="price-value">${formatCurrency(generator.daily_rate)}</span>
          </div>

          <div class="price-item">
            <span class="price-label">Weekend</span>
            <span class="price-value">${formatCurrency(generator.weekend_rate)}</span>
          </div>

          <div class="price-item">
            <span class="price-label">Weekly</span>
            <span class="price-value">${formatCurrency(generator.weekly_rate)}</span>
          </div>
        </div>

        <div class="generator-details">
          <span><strong>Fuel:</strong> ${fuelType}</span>
          <span><strong>Hours:</strong> ${Number(generator.hours) || 0}</span>
          <span><strong>Location:</strong> ${location}</span>
          <span><strong>Asset:</strong> ${escapeHtml(generator.asset_tag || "Not assigned")}</span>
            <span><strong>Serial:</strong> ${escapeHtml(generator.serial_number || "Not entered")}</span>
            <span><strong>Power:</strong> ${generator.kw_rating ?? "—"} kW</span>
        </div>

        ${descriptionMarkup}

${customSpecsMarkup}


        <div class="card-actions generator-card-actions">
          <button
            class="button button-primary availability-button"
            type="button"
            data-action="availability"
            data-id="${escapeHtml(String(generator.id))}"
          >
            Availability
          </button>

          <button
            class="button button-secondary"
            type="button"
            data-action="edit"
            data-id="${escapeHtml(String(generator.id))}"
          >
            Edit
          </button>

          <button
            class="button button-danger"
            type="button"
            data-action="delete"
            data-id="${escapeHtml(String(generator.id))}"
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  `;
}

function handleCardAction(event) {
  const button = event.target.closest("[data-action]");

  if (!button) {
    return;
  }

  const id = button.dataset.id;
  const action = button.dataset.action;

  if (action === "availability") {
    openAvailabilityModal(id);
  }

  if (action === "edit") {
    openEditForm(id);
  }

  if (action === "delete") {
    deleteGenerator(id);
  }
}

function openAvailabilityModal(generatorId) {
  const generator = generators.find(
    (item) => String(item.id) === String(generatorId)
  );

  if (!generator) {
    alert("Generator could not be found.");
    return;
  }

  const approvedBookings = rentalRequests
    .filter(
      (request) =>
        String(request.generator_id) === String(generatorId) &&
        request.status === "Approved" &&
        request.pickup_date &&
        request.return_date
    )
    .sort(
      (a, b) =>
        parseLocalDate(a.pickup_date) -
        parseLocalDate(b.pickup_date)
    );

  elements.availabilityTitle.textContent =
    `${generator.name || "Generator"} Availability`;

  const nextAvailable = calculateNextAvailableDate(approvedBookings);
  const upcomingCount = approvedBookings.filter(
    (booking) =>
      addDays(parseLocalDate(booking.return_date), 1) >=
      startOfDay(new Date())
  ).length;

  elements.availabilitySummary.innerHTML = `
    <article class="availability-summary-card">
      <span class="stat-label">Next available pickup</span>
      <strong>${escapeHtml(formatDateObject(nextAvailable))}</strong>
    </article>

    <article class="availability-summary-card">
      <span class="stat-label">Approved bookings</span>
      <strong>${approvedBookings.length}</strong>
    </article>

    <article class="availability-summary-card">
      <span class="stat-label">Current / future bookings</span>
      <strong>${upcomingCount}</strong>
    </article>
  `;

  if (approvedBookings.length === 0) {
    elements.availabilityTimeline.innerHTML = `
      <div class="availability-empty">
        <h3>No approved rentals</h3>
        <p>This generator is currently open for booking.</p>
      </div>
    `;
  } else {
    elements.availabilityTimeline.innerHTML = approvedBookings
      .map((booking) => {
        const rentalStart = parseLocalDate(booking.pickup_date);
        const rentalEnd = parseLocalDate(booking.return_date);
        const bufferDay = addDays(rentalEnd, 1);
        const isPast = bufferDay < startOfDay(new Date());

        return `
          <article class="availability-booking${isPast ? " availability-booking-past" : ""}">
            <div class="availability-booking-marker" aria-hidden="true"></div>

            <div class="availability-booking-content">
              <div class="availability-booking-heading">
                <div>
                  <p class="eyebrow">${isPast ? "Past Rental" : "Approved Rental"}</p>
                  <h3>${escapeHtml(
                    booking.customer_name || "Customer not entered"
                  )}</h3>
                </div>

                <span class="request-status request-status-approved">
                  Approved
                </span>
              </div>

              <div class="availability-date-grid">
                <div>
                  <span>Pickup</span>
                  <strong>${escapeHtml(formatDateObject(rentalStart))}</strong>
                </div>

                <div>
                  <span>Return</span>
                  <strong>${escapeHtml(formatDateObject(rentalEnd))}</strong>
                </div>

                <div class="availability-buffer-date">
                  <span>Turnaround buffer</span>
                  <strong>${escapeHtml(formatDateObject(bufferDay))}</strong>
                </div>

                <div>
                  <span>Next legal pickup</span>
                  <strong>${escapeHtml(
                    formatDateObject(addDays(bufferDay, 1))
                  )}</strong>
                </div>
              </div>

              ${
                booking.customer_phone || booking.customer_email
                  ? `
                    <p class="availability-contact">
                      ${escapeHtml(
                        [booking.customer_phone, booking.customer_email]
                          .filter(Boolean)
                          .join(" · ")
                      )}
                    </p>
                  `
                  : ""
              }
            </div>
          </article>
        `;
      })
      .join("");
  }

  elements.availabilityModal.hidden = false;
  document.body.classList.add("modal-open");
}

function closeAvailabilityModal() {
  elements.availabilityModal.hidden = true;
  elements.availabilitySummary.innerHTML = "";
  elements.availabilityTimeline.innerHTML = "";
  document.body.classList.remove("modal-open");
}

function calculateNextAvailableDate(approvedBookings) {
  let candidate = startOfDay(new Date());

  for (const booking of approvedBookings) {
    const bookedStart = parseLocalDate(booking.pickup_date);
    const blockedThrough = addDays(
      parseLocalDate(booking.return_date),
      1
    );

    if (candidate < bookedStart) {
      break;
    }

    if (candidate <= blockedThrough) {
      candidate = addDays(blockedThrough, 1);
    }
  }

  return candidate;
}

function startOfDay(date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
}

function formatDateObject(date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

async function checkAvailability(
    generatorId,
    pickupDate,
    returnDate,
    excludeRequestId = null
) {

    const { data, error } = await supabase
        .from("rental_requests")
        .select("*")
        .eq("generator_id", generatorId)
        .eq("status", "Approved");

    if (error) {
        throw error;
    }

    const requestedStart = new Date(`${pickupDate}T00:00:00`);
    const requestedEnd = new Date(`${returnDate}T00:00:00`);

    for (const booking of data) {

        if (
            excludeRequestId &&
            String(booking.id) === String(excludeRequestId)
        ) {
            continue;
        }

        const bookedStart = new Date(`${booking.pickup_date}T00:00:00`);

        const bookedEnd = new Date(`${booking.return_date}T00:00:00`);

        // One-day turnaround buffer
        bookedEnd.setDate(bookedEnd.getDate() + 1);

        const overlaps =
            requestedStart <= bookedEnd &&
            requestedEnd >= bookedStart;

        if (overlaps) {
            return false;
        }
    }

    return true;
}
async function handleRentalRequestAction(event) {
  const button = event.target.closest("[data-request-action]");

  if (!button) {
    return;
  }

  const requestId = button.dataset.requestId;
  const { data: request, error: requestError } = await supabase
    .from("rental_requests")
    .select("*")
    .eq("id", requestId)
    .single();

if (requestError) {
    alert(requestError.message);
    return;
}
  const action = button.dataset.requestAction;

  const newStatus =
    action === "approve"
      ? "Approved"
      : action === "decline"
        ? "Declined"
        : null;

  if (!newStatus || !requestId) {
    return;
  }
if (newStatus === "Approved") {

    const available = await checkAvailability(
        request.generator_id,
        request.pickup_date,
        request.return_date,
        request.id
    );

    if (!available) {

        alert(
            "This generator is already booked for those dates (including the one-day turnaround buffer)."
        );

        return;
    }
}
  button.disabled = true;

  const { error } = await supabase
    .from("rental_requests")
    .update({
      status: newStatus,
    })
    .eq("id", requestId);

  if (error) {
    console.error("Rental request update error:", error);
    alert(`Unable to update request: ${error.message}`);
    button.disabled = false;
    return;
  }

  await loadRentalRequests();
}
function addCustomSpecRow(label = "", value = "") {
  const row = document.createElement("div");
  row.className = "custom-spec-row";

  row.innerHTML = `
    <input
      class="custom-spec-label"
      type="text"
      placeholder="Specification name"
      value="${escapeHtml(label)}"
    >

    <input
      class="custom-spec-value"
      type="text"
      placeholder="Value"
      value="${escapeHtml(value)}"
    >

    <button
      class="button button-danger remove-custom-spec"
      type="button"
    >
      Remove
    </button>
  `;

  row
    .querySelector(".remove-custom-spec")
    .addEventListener("click", () => {
      row.remove();
    });

  elements.customSpecsList.appendChild(row);
}

function renderCustomSpecs(specs) {
  elements.customSpecsList.innerHTML = "";

  if (!Array.isArray(specs)) {
    return;
  }

  specs.forEach((spec) => {
    addCustomSpecRow(spec.label ?? "", spec.value ?? "");
  });
}

function getCustomSpecsFromForm() {
  return Array.from(
    elements.customSpecsList.querySelectorAll(".custom-spec-row")
  )
    .map((row) => {
      const label = row
        .querySelector(".custom-spec-label")
        .value
        .trim();

      const value = row
        .querySelector(".custom-spec-value")
        .value
        .trim();

      return { label, value };
    })
    .filter((spec) => spec.label || spec.value);
}
function openAddForm() {
  elements.form.reset();
  elements.customSpecsList.innerHTML = "";
  elements.idInput.value = "";
  elements.generatorStatusInput.value = "Available";

  resetImageState();

  elements.formTitle.textContent = "Add Generator";
  elements.saveButton.textContent = "Save Generator";
  elements.formMessage.textContent = "";

  openModal();
  elements.nameInput.focus();
}

function openEditForm(id) {
  const generator = generators.find(
    (item) => String(item.id) === String(id)
  );

  if (!generator) {
    alert("Generator could not be found.");
    return;
  }

  elements.form.reset();

  elements.idInput.value = generator.id;
  elements.nameInput.value = generator.name ?? "";
  elements.manufacturerInput.value = generator.manufacturer ?? "";
  elements.modelInput.value = generator.model ?? "";
  elements.fuelTypeInput.value = generator.fuel_type ?? "";
  elements.hoursInput.value = generator.hours ?? 0;
  elements.generatorStatusInput.value = normalizeStatus(generator.status);
  elements.locationInput.value = generator.location ?? "";
  elements.dailyRateInput.value = generator.daily_rate ?? "";
  elements.weekendRateInput.value = generator.weekend_rate ?? "";
  elements.weeklyRateInput.value = generator.weekly_rate ?? "";
  elements.descriptionInput.value = generator.description ?? "";
  elements.assetTagInput.value = generator.asset_tag ?? "";
elements.serialNumberInput.value = generator.serial_number ?? "";
elements.kwRatingInput.value = generator.kw_rating ?? "";

renderCustomSpecs(generator.custom_specs);

  selectedImages = [];
currentImageUrl = generator.image_url ?? null;

currentGeneratorImageUrls = Array.isArray(generator.image_urls)
  ? generator.image_urls
  : [];

elements.imageInput.value = "";
elements.imagePreviewList.innerHTML = "";

const existingUrls = currentGeneratorImageUrls.length
  ? currentGeneratorImageUrls
  : currentImageUrl
    ? [currentImageUrl]
    : [];

existingUrls.forEach((url) => {
  const previewItem = document.createElement("div");
  previewItem.className = "image-preview-item";

  previewItem.innerHTML = `
    <img
      class="image-preview"
      src="${escapeHtml(url)}"
      alt="${escapeHtml(generator.name || "Generator image")}"
    >

    <button
      class="button button-danger remove-existing-image"
      type="button"
    >
      Remove
    </button>
  `;

  previewItem
    .querySelector(".remove-existing-image")
    .addEventListener("click", () => {
      currentGeneratorImageUrls =
        currentGeneratorImageUrls.filter(
          (existingUrl) => existingUrl !== url
        );

      if (currentImageUrl === url) {
        currentImageUrl =
          currentGeneratorImageUrls[0] ?? null;
      }

      previewItem.remove();
    });

  elements.imagePreviewList.appendChild(previewItem);
});

  elements.formTitle.textContent = "Edit Generator";
  elements.saveButton.textContent = "Update Generator";
  elements.formMessage.textContent = "";

  openModal();
  elements.nameInput.focus();
}

function openModal() {
  elements.modal.hidden = false;
  document.body.classList.add("modal-open");
}

function closeModal() {
  elements.modal.hidden = true;
  document.body.classList.remove("modal-open");

  elements.form.reset();
  elements.customSpecsList.innerHTML = "";
  elements.idInput.value = "";
  elements.formMessage.textContent = "";

  resetImageState();
}

function resetImageState() {
  selectedImages = [];
  currentImageUrl = null;
  currentGeneratorImageUrls = [];

  elements.imageInput.value = "";
  elements.imagePreviewList.innerHTML = "";
}
function renderSelectedImagePreviews() {
  elements.imagePreviewList.innerHTML = "";

  selectedImages.forEach((file) => {
    const image = document.createElement("img");

    image.className = "image-preview";
    image.alt = file.name;
    image.src = URL.createObjectURL(file);

    elements.imagePreviewList.appendChild(image);
  });
}
  

async function saveGenerator(event) {
  event.preventDefault();

  const id = elements.idInput.value;

  elements.saveButton.disabled = true;
 elements.formMessage.textContent = selectedImages.length
  ? "Uploading images..."
  : id
    ? "Updating generator..."
    : "Saving generator...";

try {
  let imageUrl = currentImageUrl;

  const existingImageUrls = Array.isArray(currentGeneratorImageUrls)
    ? currentGeneratorImageUrls
    : [];

  let imageUrls = [...existingImageUrls];

  if (selectedImages.length > 0) {
    const uploadedUrls = await uploadGeneratorImages(selectedImages);

    imageUrls = [...imageUrls, ...uploadedUrls];

    if (!imageUrl) {
      imageUrl = uploadedUrls[0] ?? null;
    }
  }
  if (imageUrl && !imageUrls.includes(imageUrl)) {
  imageUrl = imageUrls[0] ?? null;
}
    const generatorData = {
      name: elements.nameInput.value.trim(),
      manufacturer: emptyToNull(elements.manufacturerInput.value),
      model: emptyToNull(elements.modelInput.value),
      fuel_type: emptyToNull(elements.fuelTypeInput.value),
      hours: toNumber(elements.hoursInput.value, 0),
      status: elements.generatorStatusInput.value,
      location: emptyToNull(elements.locationInput.value),
      daily_rate: toNullableNumber(elements.dailyRateInput.value),
      weekend_rate: toNullableNumber(elements.weekendRateInput.value),
      weekly_rate: toNullableNumber(elements.weeklyRateInput.value),
      running_watts: toNullableNumber(elements.runningWattsInput.value),
      starting_watts: toNullableNumber(elements.startingWattsInput.value),
      fuel_capacity_gallons: toNullableNumber(elements.fuelCapacityInput.value),
      weight_lbs: toNullableNumber(elements.weightLbsInput.value),
      custom_specs: getCustomSpecsFromForm(),
            description: emptyToNull(elements.descriptionInput.value),
            asset_tag: emptyToNull(elements.assetTagInput.value),
              serial_number: emptyToNull(elements.serialNumberInput.value),
              kw_rating: toNullableNumber(elements.kwRatingInput.value),
            image_url: imageUrl,
            image_urls: imageUrls,
          };

    let error;

    if (id) {
      const result = await supabase
        .from("generators")
        .update(generatorData)
        .eq("id", id);

      error = result.error;
    } else {
      const result = await supabase
        .from("generators")
        .insert(generatorData);

      error = result.error;
    }

    if (error) {
      throw error;
    }

    closeModal();
    await loadGenerators();
  } catch (error) {
    console.error(error);
    elements.formMessage.textContent = `Error: ${error.message}`;
  } finally {
    elements.saveButton.disabled = false;
  }
}

async function uploadGeneratorImage(file) {
  const rawExtension = file.name.split(".").pop() || "jpg";
  const extension = rawExtension
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  const fileName = `${crypto.randomUUID()}.${extension || "jpg"}`;
  const filePath = `generators/${fileName}`;

  const { error } = await supabase.storage
    .from("generator-images")
    .upload(filePath, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage
    .from("generator-images")
    .getPublicUrl(filePath);

  return data.publicUrl;
}
async function uploadGeneratorImages(files) {
  const uploadedUrls = [];

  for (const file of files) {
    const imageUrl = await uploadGeneratorImage(file);
    uploadedUrls.push(imageUrl);
  }

  return uploadedUrls;
}

async function deleteGenerator(id) {
  const generator = generators.find(
    (item) => String(item.id) === String(id)
  );

  const name = generator?.name || "this generator";

  const confirmed = confirm(
    `Delete ${name}? This cannot be undone.`
  );

  if (!confirmed) {
    return;
  }

  const { error } = await supabase
    .from("generators")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(error);
    alert(`Delete error: ${error.message}`);
    return;
  }

  await loadGenerators();
}

async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error(error);
    elements.statusText.textContent =
      `Sign-out error: ${error.message}`;
    return;
  }

  window.location.href = "../index.html";
}

function normalizeStatus(value) {
  const validStatuses = [
    "Available",
    "Reserved",
    "Rented",
    "Maintenance",
  ];

  const match = validStatuses.find(
    (status) => status.toLowerCase() === String(value).toLowerCase()
  );

  return match || "Available";
}

function emptyToNull(value) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNullableNumber(value) {
  if (value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatCurrency(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(number);
}
async function loadRentalRequests() {
  const container = elements.rentalRequestList;

  const { data, error } = await supabase
    .from("rental_requests")
    .select(`
      *,
      generators (
        name
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    rentalRequests = [];
    container.innerHTML =
      "<p class='muted-text'>Unable to load rental requests.</p>";
    renderBookingCalendar();
    return;
  }

  rentalRequests = data ?? [];
  renderBookingCalendar();

  if (rentalRequests.length === 0) {
    container.innerHTML =
      "<p class='muted-text'>No rental requests yet.</p>";
    return;
  }

  container.innerHTML = rentalRequests
    .map(
      (request) => `
        <article class="rental-request-card">
          <div class="rental-request-heading">
            <div>
              <p class="eyebrow">
                ${escapeHtml(request.requested_rate || "Rental Request")}
              </p>

              <h3>
                ${escapeHtml(
                  request.generators?.name || "Unknown Generator"
                )}
              </h3>
            </div>

            <span class="request-status request-status-${escapeHtml(
              String(request.status || "Pending").toLowerCase()
            )}">
              ${escapeHtml(request.status || "Pending")}
            </span>
          </div>

          <div class="rental-request-details">
            <p>
              <strong>Customer:</strong>
              ${escapeHtml(request.customer_name || "Not entered")}
            </p>

            <p>
              <strong>Email:</strong>
              ${escapeHtml(request.customer_email || "Not entered")}
            </p>

            <p>
              <strong>Phone:</strong>
              ${escapeHtml(request.customer_phone || "Not entered")}
            </p>

            <p>
              <strong>Pickup:</strong>
              ${escapeHtml(formatDisplayDate(request.pickup_date))}
            </p>

            <p>
              <strong>Return:</strong>
              ${escapeHtml(formatDisplayDate(request.return_date))}
            </p>
          </div>

          ${
            request.customer_notes
              ? `
                <p class="rental-request-notes">
                  <strong>Notes:</strong>
                  ${escapeHtml(request.customer_notes)}
                </p>
              `
              : ""
          }

          ${
            request.status === "Pending"
              ? `
                <div class="rental-request-actions">
                  <button
                    class="button button-primary"
                    type="button"
                    data-request-action="approve"
                    data-request-id="${escapeHtml(String(request.id))}"
                  >
                    Approve
                  </button>

                  <button
                    class="button button-danger"
                    type="button"
                    data-request-action="decline"
                    data-request-id="${escapeHtml(String(request.id))}"
                  >
                    Decline
                  </button>
                </div>
              `
              : ""
          }
        </article>
      `
    )
    .join("");
}

function renderBookingCalendar() {
  if (!elements.bookingCalendar || !elements.calendarMonthLabel) {
    return;
  }

  elements.calendarMonthLabel.textContent = new Intl.DateTimeFormat(
    "en-US",
    {
      month: "long",
      year: "numeric",
    }
  ).format(calendarMonth);

  const approvedBookings = rentalRequests.filter(
    (request) =>
      request.status === "Approved" &&
      request.pickup_date &&
      request.return_date
  );

  const firstCalendarDay = startOfWeek(calendarMonth);
  const lastCalendarDay = endOfWeek(endOfMonth(calendarMonth));
  const todayKey = toDateKey(new Date());

  const weekdayHeadings = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ]
    .map(
      (day) => `
        <div class="calendar-weekday" aria-hidden="true">
          ${day.slice(0, 3)}
        </div>
      `
    )
    .join("");

  const dayCells = [];
  let cursor = new Date(firstCalendarDay);

  while (cursor <= lastCalendarDay) {
    const dateKey = toDateKey(cursor);
    const inCurrentMonth =
      cursor.getMonth() === calendarMonth.getMonth();
    const isToday = dateKey === todayKey;

    const entries = [];

    approvedBookings.forEach((booking) => {
      const pickup = parseLocalDate(booking.pickup_date);
      const rentalReturn = parseLocalDate(booking.return_date);
      const bufferDay = addDays(rentalReturn, 1);

      if (cursor >= pickup && cursor <= rentalReturn) {
        entries.push({
          type: "rental",
          label: booking.generators?.name || "Generator",
          title: [
            booking.generators?.name || "Generator",
            booking.customer_name || "Customer not entered",
            `${formatDisplayDate(booking.pickup_date)} – ${formatDisplayDate(
              booking.return_date
            )}`,
          ].join(" | "),
        });
      } else if (toDateKey(cursor) === toDateKey(bufferDay)) {
        entries.push({
          type: "buffer",
          label: `${booking.generators?.name || "Generator"} buffer`,
          title: `${
            booking.generators?.name || "Generator"
          } turnaround buffer after ${
            booking.customer_name || "approved rental"
          }`,
        });
      }
    });

    const entryMarkup = entries
      .map(
        (entry) => `
          <div
            class="calendar-entry calendar-entry-${entry.type}"
            title="${escapeHtml(entry.title)}"
          >
            ${escapeHtml(entry.label)}
          </div>
        `
      )
      .join("");

    dayCells.push(`
      <div
        class="calendar-day${inCurrentMonth ? "" : " calendar-day-outside"}${
          isToday ? " calendar-day-today" : ""
        }"
        data-date="${dateKey}"
      >
        <div class="calendar-day-number">${cursor.getDate()}</div>
        <div class="calendar-day-events">
          ${entryMarkup}
        </div>
      </div>
    `);

    cursor = addDays(cursor, 1);
  }

  elements.bookingCalendar.innerHTML = `
    <div class="calendar-grid">
      ${weekdayHeadings}
      ${dayCells.join("")}
    </div>
  `;
}

function parseLocalDate(dateString) {
  return new Date(`${dateString}T00:00:00`);
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function startOfWeek(date) {
  return addDays(date, -date.getDay());
}

function endOfWeek(date) {
  return addDays(date, 6 - date.getDay());
}

function addDays(date, amount) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

function addMonths(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateString) {
  if (!dateString) {
    return "Not entered";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parseLocalDate(dateString));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}