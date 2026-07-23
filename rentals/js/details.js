import { supabase } from "./supabase-client.js";

const elements = {
  status: document.getElementById("details-status"),
  article: document.getElementById("generator-details"),

  imageGallery: document.getElementById("details-image-gallery"),
  
 

  manufacturer: document.getElementById("details-manufacturer"),
  name: document.getElementById("details-name"),
  description: document.getElementById("details-description"),

  dailyRate: document.getElementById("details-daily-rate"),
  weekendRate: document.getElementById("details-weekend-rate"),
  weeklyRate: document.getElementById("details-weekly-rate"),

  standardSpecifications: document.getElementById(
    "standard-specifications"
  ),
  
 
  bottomRequestButton: document.getElementById(
  "bottom-request-button"
),

rentalForm: document.getElementById("rental-request-form"),
customerName: document.getElementById("customer-name"),
customerEmail: document.getElementById("customer-email"),
customerPhone: document.getElementById("customer-phone"),
calculatedRate: document.getElementById("calculated-rate"),
pickupDate: document.getElementById("pickup-date"),
returnDate: document.getElementById("return-date"),
customerNotes: document.getElementById("customer-notes"),
rentalRequestMessage: document.getElementById(
  "rental-request-message"
),
submitRentalRequest: document.getElementById(
  "submit-rental-request"
),
}

let generator = null;

initialize();

async function initialize() {
  const params = new URLSearchParams(window.location.search);
  const generatorId = params.get("id");

  if (!generatorId) {
    showError("No generator was selected.");
    return;
  }

 await loadGenerator(generatorId);

elements.pickupDate.addEventListener(
  "change",
  updateCalculatedRate
);

elements.returnDate.addEventListener(
  "change",
  updateCalculatedRate
);

elements.rentalForm.addEventListener(
  "submit",
  handleRentalRequest
);
}

async function loadGenerator(id) {
  const { data, error } = await supabase
    .from("generators")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error(error);
    showError(`Unable to load generator: ${error.message}`);
    return;
  }

  generator = data;
  renderGenerator();
}

function renderGenerator() {
  const status = normalizeStatus(generator.status);
  const statusClass = status.toLowerCase();

  document.title =
    `${generator.name || "Generator"} | RandomLand USA`;

  elements.status.hidden = true;
  elements.article.hidden = false;

  const galleryUrls = Array.isArray(generator.image_urls)
  ? generator.image_urls.filter(Boolean)
  : [];

const allImageUrls = galleryUrls.length
  ? galleryUrls
  : generator.image_url
    ? [generator.image_url]
    : [];

if (allImageUrls.length === 0) {
  elements.imageGallery.innerHTML = `
    <div class="details-image-placeholder">
      No photo available
    </div>
  `;
} else {
  elements.imageGallery.innerHTML = `
    <div class="details-gallery-main">
      <button
        class="gallery-arrow gallery-arrow-left"
        type="button"
        aria-label="Previous photo"
      >
        &#10094;
      </button>

      <img
        id="active-gallery-image"
        class="details-gallery-main-image"
        src="${escapeHtml(allImageUrls[0])}"
        alt="${escapeHtml(
          `${generator.name || "Generator"} photo 1`
        )}"
      >

      <button
        class="gallery-arrow gallery-arrow-right"
        type="button"
        aria-label="Next photo"
      >
        &#10095;
      </button>
    </div>

    <div class="details-gallery-thumbnails">
      ${allImageUrls
        .map(
          (url, index) => `
            <button
              class="gallery-thumbnail-button ${
                index === 0 ? "active" : ""
              }"
              type="button"
              data-gallery-index="${index}"
              aria-label="View photo ${index + 1}"
            >
              <img
                class="gallery-thumbnail-image"
                src="${escapeHtml(url)}"
                alt="${escapeHtml(
                  `${generator.name || "Generator"} thumbnail ${
                    index + 1
                  }`
                )}"
              >
            </button>
          `
        )
        .join("")}
    </div>
  `;

  initializeImageGallery(allImageUrls);




  elements.manufacturer.textContent = [
    generator.manufacturer,
    generator.model,
  ]
    .filter(Boolean)
    .join(" · ");

  elements.name.textContent =
    generator.name || "Generator";

  elements.description.textContent =
    generator.description ||
    "Contact us for complete rental details.";

  elements.dailyRate.textContent =
    formatWholeCurrency(generator.daily_rate);

  elements.weekendRate.textContent =
    formatWholeCurrency(generator.weekend_rate);

  elements.weeklyRate.textContent =
    formatWholeCurrency(generator.weekly_rate);

  renderStandardSpecifications();
 



 
}
}
function initializeImageGallery(imageUrls) {
  const activeImage = document.getElementById(
    "active-gallery-image"
  );

  const thumbnailButtons = Array.from(
    document.querySelectorAll("[data-gallery-index]")
  );

  const previousButton = document.querySelector(
    ".gallery-arrow-left"
  );

  const nextButton = document.querySelector(
    ".gallery-arrow-right"
  );

  let activeIndex = 0;

  function showImage(index) {
    if (!imageUrls.length || !activeImage) {
      return;
    }

    activeIndex =
      (index + imageUrls.length) % imageUrls.length;

    activeImage.src = imageUrls[activeIndex];

    activeImage.alt = `${
      generator.name || "Generator"
    } photo ${activeIndex + 1}`;

    thumbnailButtons.forEach((button, buttonIndex) => {
      button.classList.toggle(
        "active",
        buttonIndex === activeIndex
      );
    });
  }

  thumbnailButtons.forEach((button) => {
    button.addEventListener("click", () => {
      showImage(Number(button.dataset.galleryIndex));
    });
  });

  previousButton?.addEventListener("click", () => {
    showImage(activeIndex - 1);
  });

  nextButton?.addEventListener("click", () => {
    showImage(activeIndex + 1);
  });

  if (imageUrls.length === 1) {
    previousButton?.setAttribute("hidden", "");
    nextButton?.setAttribute("hidden", "");
  }
}
function renderStandardSpecifications() {
  const specifications = [
    ["Running watts", formatValue(generator.running_watts, "W")],
    ["Starting watts", formatValue(generator.starting_watts, "W")],
    [
        "Fuel capacity",
        formatValue(generator.fuel_capacity_gallons, "gal"),
    ],
    ["Weight", formatValue(generator.weight_lbs, "lbs")],
    ["Fuel type", generator.fuel_type],
    ["120V / 125V outlets", generator.outlet_120v],
    ["240V outlets", generator.outlet_240v],
];

// Add any custom specifications to the same list
if (Array.isArray(generator.custom_specs)) {
    generator.custom_specs.forEach(spec => {
        if (spec?.label || spec?.value) {
            specifications.push([
                spec.label || "Specification",
                spec.value || "-"
            ]);
        }
    });
}

const filteredSpecifications = specifications.filter(([, value]) => value);

  if (specifications.length === 0) {
    elements.standardSpecifications.innerHTML =
      "<p>Specifications are being updated.</p>";
    return;
  }

  elements.standardSpecifications.innerHTML = specifications
    .map(
      ([label, value]) => `
        <div class="details-spec-row">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(String(value))}</strong>
        </div>
      `
    )
    .join("");
}




function renderCustomSpecifications() {
  const customSpecs = Array.isArray(generator.custom_specs)
    ? generator.custom_specs.filter(
        (spec) => spec?.label || spec?.value
      )
    : [];

  if (customSpecs.length === 0) {
    elements.customSection.hidden = true;
    return;
  }

  elements.customSection.hidden = false;

  elements.customSpecifications.innerHTML = customSpecs
    .map(
      (spec) => `
        <div class="details-spec-row">
          <span>
            ${escapeHtml(spec.label || "Specification")}
          </span>

          <strong>
            ${escapeHtml(spec.value || "—")}
          </strong>
        </div>
      `
    )
    .join("");
}
function calculateRentalRate(pickupDate, returnDate) {
  if (!pickupDate || !returnDate) {
    return "";
  }

  const start = new Date(`${pickupDate}T00:00:00`);
  const end = new Date(`${returnDate}T00:00:00`);

  const dayDifference =
    Math.round((end - start) / (1000 * 60 * 60 * 24));
if (dayDifference > 7) {
  return "Too long";
}
  if (dayDifference < 0) {
    return "";
  }

  // Seven consecutive rental days
  if (dayDifference === 7) {
    return "Weekly";
  }

  // Saturday pickup and Sunday return
  if (
    start.getDay() === 6 &&
    end.getDay() === 0 &&
    dayDifference === 1
  ) {
    return "Weekend";
  }

  return "Daily";
}

function updateCalculatedRate() {
  const rentalOption = calculateRentalRate(
    elements.pickupDate.value,
    elements.returnDate.value
  );
if (rentalOption === "Too long") {
  showRentalMessage(
    "Rentals are limited to 7 consecutive days per request. If you need the generator longer, let us know in the Additional Information section. Longer rentals are available in one-week increments.",
    "error"
  );
  return;
}
  if (rentalOption === "Too long") {
    elements.calculatedRate.value = "Maximum rental is 7 days";

    showRentalMessage(
      "Rentals cannot be longer than 7 days. Please choose an earlier return date.",
      "error"
    );

    elements.submitRentalRequest.disabled = true;
    return;
  }

  elements.calculatedRate.value =
    rentalOption || "Calculated automatically";

  elements.submitRentalRequest.disabled = false;

  if (
    elements.rentalRequestMessage.textContent.includes(
      "Rentals cannot be longer"
    )
  ) {
    showRentalMessage("");
  }
}

  async function handleRentalRequest(event) {
  event.preventDefault();

  if (!generator) {
    showRentalMessage(
      "Unable to identify the selected generator.",
      "error"
    );
    return;
  }
  const customerName = elements.customerName.value.trim();
const customerEmail = elements.customerEmail.value.trim();
const customerPhone = elements.customerPhone.value.trim();
const rentalOption = calculateRentalRate(
  elements.pickupDate.value,
  elements.returnDate.value
);
if (rentalOption === "Too long") {
  showRentalMessage(
    "Rentals are limited to 7 consecutive days per request. If you need the generator longer, let us know in the Additional Information section. Longer rentals are available in one-week increments.",
    "error"
  );
  return;
}
const pickupDate = elements.pickupDate.value;
const returnDate = elements.returnDate.value;
const customerNotes =
  elements.customerNotes?.value.trim() || "";
  

  if (
    !customerName ||
    !customerEmail ||
    !customerPhone ||
    !rentalOption ||
    !pickupDate ||
    !returnDate
  ) {
    showRentalMessage(
      "Please complete all required fields.",
      "error"
    );
    return;
  }

  if (returnDate < pickupDate) {
    showRentalMessage(
      "The return date cannot be before the pickup date.",
      "error"
    );
    return;
  }

  elements.submitRentalRequest.disabled = true;

  showRentalMessage(
    "Submitting your rental request...",
    "pending"
  );

  const { error } = await supabase
    .from("rental_requests")
    .insert({
      generator_id: generator.id,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      pickup_date: pickupDate,
      return_date: returnDate,
      requested_rate: rentalOption,
      customer_notes: customerNotes || null,
      status: "Pending",
    });

  elements.submitRentalRequest.disabled = false;

  if (error) {
    console.error("Rental request error:", error);

    showRentalMessage(
      `Unable to submit your request: ${error.message}`,
      "error"
    );
    return;
  }

  elements.rentalForm.innerHTML = `
  <div class="rental-success-screen">
    <div class="rental-success-icon">✓</div>

    <h2>Rental Request Submitted</h2>

    <p>
      Your rental request has been submitted.
      We will contact you to confirm availability.
    </p>

    <a class="rental-success-link" href="index.html">
      Back to Generator Rentals
    </a>
  </div>
`;
}
function showRentalMessage(message, type = "") {
    elements.rentalRequestMessage.textContent = message;

    elements.rentalRequestMessage.className =
        "rental-request-message";

    if (type) {
        elements.rentalRequestMessage.classList.add(
            `rental-request-message-${type}`
        );
    }
}
function showError(message) {
  elements.status.textContent = message;
  elements.article.hidden = true;
}



function formatValue(value, suffix) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return `${value} ${suffix}`;
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

