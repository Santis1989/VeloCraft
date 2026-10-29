/**
 * VeloCraft - MVC CRUD & Catalog Controller
 * Manages carbon fiber and titanium bicycle frames inventory and storefront listing.
 */

// ==========================================
// 1. MODEL & SEED DATA
// ==========================================
const DEFAULT_FRAMES = [
    {
        id: "frame-1",
        name: "VeloCraft Carbon SLR",
        material: "carbon",
        weight: 790,
        price: 3200,
        sizes: ["S", "M", "L"],
        description: "Cuadro de ruta superligero fabricado con fibra de carbono Toray T1100 de grado aeroespacial. Optimizado para máxima rigidez y aerodinámica en ascensos exigentes.",
        image: "img/carbono.png"
    },
    {
        id: "frame-2",
        name: "Titanium Adventure Ti-9",
        material: "titanium",
        weight: 1420,
        price: 4500,
        sizes: ["M", "L", "XL"],
        description: "Cuadro de gravel indestructible de titanio Grado 9 (Ti-3Al-2.5V) de doble conificado. Combina una absorción de vibraciones inigualable con anclajes para portabultos y aventuras de larga distancia.",
        image: "img/titanio.png"
    },
    {
        id: "frame-3",
        name: "VeloCraft Carbon XC-Pro",
        material: "carbon",
        weight: 980,
        price: 2850,
        sizes: ["S", "M", "L", "XL"],
        description: "Cuadro rígido de montaña diseñado para Cross-Country competitivo. Geometría agresiva, guiado de cables interno y un laminado de carbono específico para disipar impactos de senderos técnicos.",
        image: "img/carbono_xc_pro.png"
    }
];

class FrameInventoryModel {
    constructor() {
        this.storageKey = "velocraft_inventory";
        this.init();
    }
init() {
    if (!localStorage.getItem(this.storageKey)) {
        localStorage.setItem(this.storageKey, JSON.stringify(DEFAULT_FRAMES));
    }

    const frames = this.getAll();

    const carbono = frames.find(frame => frame.id === "frame-1");
    const titanio = frames.find(frame => frame.id === "frame-2");
    const carbonoXC = frames.find(frame => frame.id === "frame-3");

    if (carbono) {
        carbono.image = "img/carbono.png";
    }

    if (titanio) {
        titanio.image = "img/titanio.png";
    }

    if (carbonoXC) {
        carbonoXC.image = "img/carbono_xc_pro.png";
    }

    this.save(frames);
}

    getAll() {
        return JSON.parse(localStorage.getItem(this.storageKey)) || [];
    }

    getById(id) {
        return this.getAll().find(frame => frame.id === id);
    }

    save(frames) {
        localStorage.setItem(this.storageKey, JSON.stringify(frames));
    }

    create(frameData) {
        const frames = this.getAll();
        const newFrame = {
            id: `frame-${Date.now()}`,
            ...frameData
        };
        frames.push(newFrame);
        this.save(frames);
        return newFrame;
    }

    update(id, updatedData) {
        let frames = this.getAll();
        const index = frames.findIndex(frame => frame.id === id);
        if (index !== -1) {
            frames[index] = { ...frames[index], ...updatedData };
            this.save(frames);
            return frames[index];
        }
        return null;
    }

    delete(id) {
        let frames = this.getAll();
        const filtered = frames.filter(frame => frame.id !== id);
        if (frames.length !== filtered.length) {
            this.save(filtered);
            return true;
        }
        return false;
    }
}

// Instantiate Model
const model = new FrameInventoryModel();

// ==========================================
// 2. VIEW CONTROLLER (DOM RENDERERS)
// ==========================================
const UI = {
    catalogGrid: document.getElementById("catalogGrid"),
    searchInput: document.getElementById("searchInput"),
    sortBy: document.getElementById("sortBy"),
    filterButtons: document.querySelectorAll("#materialFilters .btn-filter"),
    
    // Stats elements
    statTotalCount: document.getElementById("statTotalCount"),
    statCarbonCount: document.getElementById("statCarbonCount"),
    statTitaniumCount: document.getElementById("statTitaniumCount"),
    statTotalValue: document.getElementById("statTotalValue"),
    
    // Forms
    addForm: document.getElementById("frameForm"),
    editForm: document.getElementById("editForm"),
    
    // Modals
    detailModal: new bootstrap.Modal(document.getElementById("detailModal")),
    editModal: new bootstrap.Modal(document.getElementById("editModal")),
    detailModalBody: document.getElementById("detailModalBody"),
    
    // State variables for filter/sorting
    currentMaterialFilter: "all",
    currentSearchQuery: "",
    currentSort: "name"
};

// Render stats panel
function renderStats() {
    const frames = model.getAll();
    const totalCount = frames.length;
    const carbonCount = frames.filter(f => f.material === "carbon").length;
    const titaniumCount = frames.filter(f => f.material === "titanium").length;
    const totalValue = frames.reduce((sum, f) => sum + Number(f.price), 0);
    
    UI.statTotalCount.textContent = totalCount;
    UI.statCarbonCount.textContent = carbonCount;
    UI.statTitaniumCount.textContent = titaniumCount;
    UI.statTotalValue.textContent = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
    }).format(totalValue);
}

// Render dynamic catalog card
function createCardElement(frame) {
    const isCarbon = frame.material === "carbon";
    const materialBadge = isCarbon 
        ? `<span class="frame-card-badge badge-carbon"><i class="bi bi-cpu me-1"></i>Carbono</span>`
        : `<span class="frame-card-badge badge-titanium"><i class="bi bi-shield-shaded me-1"></i>Titanio</span>`;
    
    const sizeBadges = frame.sizes.map(s => `<span class="badge bg-secondary me-1">${s}</span>`).join("");
    
    const cardHTML = `
        <article class="col-12 col-md-6 col-xl-4 fade-in-up" id="card-${frame.id}">
            <div class="glass-panel frame-card h-100">
                <div class="frame-card-img-wrapper">
                    ${materialBadge}
                    <img src="${frame.image}" alt="${frame.name}" class="frame-card-img" onerror="this.src='https://placehold.co/600x400/22241e/ffffff?text=${encodeURIComponent(frame.name)}'">
                </div>
                <div class="frame-card-body">
                    <h3 class="h5 text-white mb-2">${frame.name}</h3>
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <span class="frame-price">${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(frame.price)}</span>
                        <span class="text-secondary small font-monospace"><i class="bi bi-speedometer2 me-1"></i>${frame.weight} g</span>
                    </div>
                    <p class="text-secondary small flex-grow-1 text-truncate-3-lines">${frame.description}</p>
                    <div class="mb-3">
                        <span class="text-secondary small me-2">Tallas:</span>
                        ${sizeBadges}
                    </div>
                    <div class="d-flex gap-2 pt-2 border-top border-secondary">
                        <button class="btn btn-outline-premium btn-sm flex-grow-1" onclick="viewDetails('${frame.id}')">
                            <i class="bi bi-eye"></i> Detalles
                        </button>
                        <button class="btn btn-warning btn-sm text-dark" onclick="openEditModal('${frame.id}')" title="Editar">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="deleteFrame('${frame.id}')" title="Eliminar">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        </article>
    `;
    return cardHTML;
}

// Render overall catalog grid
function renderCatalog() {
    let frames = model.getAll();
    
    // Apply material filter
    if (UI.currentMaterialFilter !== "all") {
        frames = frames.filter(f => f.material === UI.currentMaterialFilter);
    }
    
    // Apply search filter
    if (UI.currentSearchQuery.trim() !== "") {
        const query = UI.currentSearchQuery.toLowerCase();
        frames = frames.filter(f => 
            f.name.toLowerCase().includes(query) || 
            f.description.toLowerCase().includes(query)
        );
    }
    
    // Apply sorting
    frames.sort((a, b) => {
        if (UI.currentSort === "name") {
            return a.name.localeCompare(b.name);
        } else if (UI.currentSort === "price-asc") {
            return a.price - b.price;
        } else if (UI.currentSort === "price-desc") {
            return b.price - a.price;
        } else if (UI.currentSort === "weight") {
            return a.weight - b.weight;
        }
        return 0;
    });

    // Render elements
    if (frames.length === 0) {
        UI.catalogGrid.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="bi bi-search-heart fs-1 text-secondary d-block mb-3"></i>
                <h4 class="text-secondary">No se encontraron cuadros</h4>
                <p class="text-secondary-50">Intenta cambiar el término de búsqueda o filtros.</p>
            </div>
        `;
    } else {
        UI.catalogGrid.innerHTML = frames.map(frame => createCardElement(frame)).join("");
    }
}

// Show Toast notification helper
function showToast(message, type = "success") {
    const toastEl = document.getElementById("actionToast");
    const toastMsg = document.getElementById("toastMessage");
    const toastIcon = document.getElementById("toastIcon");
    
    // Set type styling
    toastEl.className = `toast custom-toast ${type}`;
    
    if (type === "success") {
        toastIcon.className = "bi bi-check-circle-fill text-info";
    } else {
        toastIcon.className = "bi bi-info-circle-fill text-warning";
    }
    
    toastMsg.textContent = message;
    
    const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
    toast.show();
}

// ==========================================
// 3. CONTROLLER & EVENT LISTENERS
// ==========================================

// View frame details modal
window.viewDetails = function(id) {
    const frame = model.getById(id);
    if (!frame) return;
    
    const isCarbon = frame.material === "carbon";
    const materialText = isCarbon ? "Fibra de Carbono (Toray T1100 Aero)" : "Titanio Grado 9 (Ti-3Al-2.5V)";
    const materialClass = isCarbon ? "text-info" : "text-warning";
    
    UI.detailModalBody.innerHTML = `
        <div class="row g-4">
            <div class="col-12 col-md-5">
                <img src="${frame.image}" alt="${frame.name}" class="img-fluid rounded border border-secondary" onerror="this.src='https://placehold.co/600x400/22241e/ffffff?text=${encodeURIComponent(frame.name)}'">
            </div>
            <div class="col-12 col-md-7">
                <h4 class="text-white h3 mb-2">${frame.name}</h4>
                <p class="h4 ${materialClass} mb-3 font-monospace">${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(frame.price)} USD</p>
                <div class="mb-4">
                    <span class="badge bg-secondary p-2 me-2">${frame.material.toUpperCase()}</span>
                    <span class="badge bg-dark border border-secondary p-2"><i class="bi bi-speedometer2 me-1"></i>${frame.weight} gramos</span>
                </div>
                <h5 class="h6 text-secondary text-uppercase font-monospace mb-2">Descripción Técnica</h5>
                <p class="text-secondary-50 mb-4">${frame.description}</p>
                <div class="row g-2 border-top border-secondary pt-3">
                    <div class="col-6">
                        <span class="text-secondary small d-block font-monospace">MATERIAL</span>
                        <strong class="text-white">${materialText}</strong>
                    </div>
                    <div class="col-6">
                        <span class="text-secondary small d-block font-monospace">TALLAS EN STOCK</span>
                        <strong class="text-white">${frame.sizes.join(", ")}</strong>
                    </div>
                </div>
            </div>
        </div>
    `;
    UI.detailModal.show();
};

// Open edit modal and populate data
window.openEditModal = function(id) {
    const frame = model.getById(id);
    if (!frame) return;
    
    document.getElementById("editFrameId").value = frame.id;
    document.getElementById("editFrameName").value = frame.name;
    document.getElementById("editFrameMaterial").value = frame.material;
    document.getElementById("editFrameWeight").value = frame.weight;
    document.getElementById("editFramePrice").value = frame.price;
    document.getElementById("editFrameDescription").value = frame.description;
    document.getElementById("editFrameImage").value = frame.image;
    
    // Clear and check matching checkboxes
    const sizes = ["S", "M", "L", "XL"];
    sizes.forEach(size => {
        const checkbox = document.getElementById(`editSize${size}`);
        checkbox.checked = frame.sizes.includes(size);
    });
    
    // Hide previous validations
    UI.editForm.classList.remove("was-validated");
    document.getElementById("editSizeValidationError").classList.add("d-none");
    
    UI.editModal.show();
};

// Delete frame operation
window.deleteFrame = function(id) {
    const frame = model.getById(id);
    if (!frame) return;
    
    if (confirm(`¿Estás seguro de que deseas eliminar el cuadro "${frame.name}"?`)) {
        const card = document.getElementById(`card-${id}`);
        if (card) {
            // Smooth exit animation
            card.style.transition = "all 0.4s ease";
            card.style.opacity = "0";
            card.style.transform = "translateY(20px) scale(0.95)";
            
            setTimeout(() => {
                model.delete(id);
                renderCatalog();
                renderStats();
                showToast(`Cuadro "${frame.name}" eliminado correctamente.`, "info");
            }, 4000 / 10); // Sync animation wait
        } else {
            model.delete(id);
            renderCatalog();
            renderStats();
            showToast(`Cuadro "${frame.name}" eliminado correctamente.`, "info");
        }
    }
};

// Handle Create (Form Submit)
UI.addForm.addEventListener("submit", function(event) {
    event.preventDefault();
    
    // Custom Checkbox validation for sizes
    const selectedSizes = [];
    const sizes = ["S", "M", "L", "XL"];
    sizes.forEach(size => {
        const chk = document.getElementById(`size${size}`);
        if (chk.checked) selectedSizes.push(size);
    });
    
    const sizeValidationError = document.getElementById("sizeValidationError");
    
    if (selectedSizes.length === 0) {
        sizeValidationError.classList.remove("d-none");
    } else {
        sizeValidationError.classList.add("d-none");
    }
    
    // Bootstrap Validation API check
    if (!UI.addForm.checkValidity() || selectedSizes.length === 0) {
        event.stopPropagation();
        UI.addForm.classList.add("was-validated");
        return;
    }
    
    // Retrieve fields
    const frameData = {
        name: document.getElementById("frameName").value.trim(),
        material: document.getElementById("frameMaterial").value,
        weight: Number(document.getElementById("frameWeight").value),
        price: Number(document.getElementById("framePrice").value),
        sizes: selectedSizes,
        description: document.getElementById("frameDescription").value.trim(),
        image: document.getElementById("frameImage").value
    };
    
    const newFrame = model.create(frameData);
    
    // Reset Form
    UI.addForm.reset();
    UI.addForm.classList.remove("was-validated");
    
    // Render and toast
    renderCatalog();
    renderStats();
    showToast(`Cuadro "${newFrame.name}" agregado con éxito.`, "success");
    
    // Collapse Manager Panel on Mobile
    if (window.innerWidth < 992) {
        const collapseInst = bootstrap.Collapse.getInstance(document.getElementById("managerPanel"));
        if (collapseInst) collapseInst.hide();
    }
});

// Handle Update (Form Submit in Modal)
UI.editForm.addEventListener("submit", function(event) {
    event.preventDefault();
    
    const id = document.getElementById("editFrameId").value;
    
    // Validate sizes checkbox list
    const selectedSizes = [];
    const sizes = ["S", "M", "L", "XL"];
    sizes.forEach(size => {
        const chk = document.getElementById(`editSize${size}`);
        if (chk.checked) selectedSizes.push(size);
    });
    
    const editSizeValErr = document.getElementById("editSizeValidationError");
    if (selectedSizes.length === 0) {
        editSizeValErr.classList.remove("d-none");
    } else {
        editSizeValErr.classList.add("d-none");
    }
    
    if (!UI.editForm.checkValidity() || selectedSizes.length === 0) {
        event.stopPropagation();
        UI.editForm.classList.add("was-validated");
        return;
    }
    
    const updatedData = {
        name: document.getElementById("editFrameName").value.trim(),
        material: document.getElementById("editFrameMaterial").value,
        weight: Number(document.getElementById("editFrameWeight").value),
        price: Number(document.getElementById("editFramePrice").value),
        sizes: selectedSizes,
        description: document.getElementById("editFrameDescription").value.trim(),
        image: document.getElementById("editFrameImage").value
    };
    
    model.update(id, updatedData);
    
    UI.editModal.hide();
    renderCatalog();
    renderStats();
    showToast(`Cuadro "${updatedData.name}" actualizado correctamente.`, "success");
});

// Setup Live Search
UI.searchInput.addEventListener("input", function() {
    UI.currentSearchQuery = this.value;
    renderCatalog();
});

// Setup Sorting
UI.sortBy.addEventListener("change", function() {
    UI.currentSort = this.value;
    renderCatalog();
});

// Setup Material Quick Filters
UI.filterButtons.forEach(btn => {
    btn.addEventListener("click", function() {
        UI.filterButtons.forEach(b => b.classList.remove("active"));
        this.classList.add("active");
        
        UI.currentMaterialFilter = this.getAttribute("data-material");
        renderCatalog();
    });
});

// On size checkbox clicks, hide validation error if checked
const checkboxSelectors = ["sizeS", "sizeM", "sizeL", "sizeXL", "editSizeS", "editSizeM", "editSizeL", "editSizeXL"];
checkboxSelectors.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener("change", () => {
            const isEdit = id.startsWith("edit");
            const errId = isEdit ? "editSizeValidationError" : "sizeValidationError";
            const selectorPref = isEdit ? "editSize" : "size";
            const sizes = ["S", "M", "L", "XL"];
            const anyChecked = sizes.some(sz => document.getElementById(`${selectorPref}${sz}`).checked);
            
            if (anyChecked) {
                document.getElementById(errId).classList.add("d-none");
            } else {
                document.getElementById(errId).classList.remove("d-none");
            }
        });
    }
});

// ==========================================
// 4. INITIALIZATION
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    renderCatalog();
    renderStats();
});
