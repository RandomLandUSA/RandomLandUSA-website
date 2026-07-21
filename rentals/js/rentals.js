import { supabase } from "./supabase-client.js";

const grid = document.getElementById("generator-grid");
const searchInput = document.getElementById("search");
const powerFilter = document.getElementById("power-filter");

let generators = [];

initialize();

async function initialize() {
  connectEventListeners();
  await loadGenerators();
}

function connectEventListeners() {
  searchInput.addEventListener("input", applyFilters);
  powerFilter.addEventListener("change", applyFilters);

  grid.addEventListener("click", handleCardClick);
}

async function loadGenerators() {
  grid.innerHTML = "<p>Loading generators...</p>";

  const { data, error } = await supabase
    .from("generators")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Supabase error:", error);
    grid.innerHTML = `
      <p>
        Unable to load generators: ${escapeHtml(error.message)}
      </p>
    `;
    return;
  }

  generators = data ?? [];
  applyFilters();
}

function applyFilters() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  const selectedPower = powerFilter.value;

  const filteredGenerators = generators.filter((generator) => {
    const searchableText = [
      generator.name,
      generator.manufacturer,
      generator.model,
      generator.description,
      generator.running_watts,
      generator.starting_watts,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch =
      searchTerm === "" || searchableText.includes(searchTerm);

    const wattage = Number(
      generator.starting_watts ||
      generator.running_watts ||
      generator.model ||
      0
    );

    const matchesPower =
      selectedPower === "" ||
      wattage === Number(selectedPower);

    return matchesSearch && matchesPower;
  });

  renderGenerators(filteredGenerators);
}

function renderGenerators(filteredGenerators) {
  if (filteredGenerators.length === 0) {
    grid.innerHTML = `
      <p>No generators match your search.</p>
    `;
    return;
  }

  grid.innerHTML = filteredGenerators
    .map(createGeneratorCard)
    .join("");
}

function createGeneratorCard(generator) {
  const status = normalizeStatus(generator.status);
  const statusClass = status.toLowerCase();

  const imageMarkup = generator.image_url
    ? `
      <img
        src="${escapeHtml(generator.image_url)}"
        class="generator-image"
        alt="${escapeHtml(generator.name || "Generator")}"
      >
    `
    : `
      <div class="generator-placeholder">
        No photo available
      </div>
    `;

  const specs = [];

  if (generator.running_watts) {
    specs.push(`
      <span>
        <strong>${escapeHtml(generator.running_watts)}W</strong>
        running
      </span>
    `);
  }

  if (generator.runtime_hours) {
    specs.push(`
      <span>
        <strong>${escapeHtml(generator.runtime_hours)} hrs</strong>
        runtime
      </span>
    `);
  }

  

  const specsMarkup =
    specs.length > 0
      ? `
        <div class="customer-specs">
          ${specs.join("")}
        </div>
      `
      : "";

  return `
    <article class="generator-card">
      <div class="generator-image-wrap">
        ${imageMarkup}      
      </div>

      <div class="generator-info">
        <h2>${escapeHtml(generator.name || "Generator")}</h2>
        <div class="price-grid">
          <div class="price-box">
            <span class="price-label">Daily</span>
            <span class="price-value">
              ${formatWholeCurrency(generator.daily_rate)}
            </span>
          </div>

          <div class="price-box">
            <span class="price-label">Weekend</span>
            <span class="price-value">
              ${formatWholeCurrency(generator.weekend_rate)}
            </span>
          </div>

          <div class="price-box">
            <span class="price-label">Weekly</span>
            <span class="price-value">
              ${formatWholeCurrency(generator.weekly_rate)}
            </span>
          </div>
        </div>

        ${specsMarkup}

        <div class="card-buttons">
         
          <button
            class="rent-button"
            type="button"
            data-action="rent"
            data-id="${escapeHtml(String(generator.id))}"
          >
            Rent Now
          </button>
        </div>
      </div>
    </article>
  `;
}

function handleCardClick(event) {
  const button = event.target.closest("[data-action]");

  if (!button) {
    return;
  }

  const id = button.dataset.id;
  const action = button.dataset.action;

  if (action === "details") {
    window.location.href = `details.html?id=${encodeURIComponent(id)}`;
  }

  if (action === "rent") {
    window.location.href = `details.html?id=${encodeURIComponent(id)}#rent`;
  }
}

function normalizeStatus(value) {
  const statuses = [
    "Available",
    "Reserved",
    "Rented",
    "Maintenance",
  ];

  const match = statuses.find(
    (status) =>
      status.toLowerCase() === String(value || "").toLowerCase()
  );

  return match || "Available";
}

function formatWholeCurrency(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "Call";
  }

  return `$${Math.round(amount)}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}