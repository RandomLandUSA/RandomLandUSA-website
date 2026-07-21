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

  elements.form.addEventListener("submit", saveGenerator);

 elements.imageInput.addEventListener("change", (event) => {
  selectedImages = Array.from(event.target.files ?? []);
  renderSelectedImagePreviews();
});

  document.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", closeModal);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !elements.modal.hidden) {
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


        <div class="card-actions">
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

  if (action === "edit") {
    openEditForm(id);
  }

  if (action === "delete") {
    deleteGenerator(id);
  }
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

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}