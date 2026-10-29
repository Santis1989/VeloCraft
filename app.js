
/*
 * VELOCRAFT
 * Catálogo de cuadros y bicicletas
 * CRUD + fotografías guardadas en IndexedDB
 */

// ========================================
// 1. PRODUCTOS INICIALES
// ========================================

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

// ========================================
// 2. MODELO: LOCALSTORAGE
// ========================================

class FrameInventoryModel {

    constructor() {
        this.storageKey = "velocraft_inventory";
        this.init();
    }

    init() {
        // No sobrescribir los productos existentes.
        if (localStorage.getItem(this.storageKey) === null) {
            this.save(DEFAULT_FRAMES);
        }
    }

    getAll() {
        try {
            const frames = JSON.parse(
                localStorage.getItem(this.storageKey)
            );

            return Array.isArray(frames) ? frames : [];
        } catch (error) {
            console.error("Error leyendo inventario:", error);
            return [];
        }
    }

    getById(id) {
        return this.getAll().find(frame => frame.id === id);
    }

    save(frames) {
        localStorage.setItem(
            this.storageKey,
            JSON.stringify(frames)
        );
    }

    create(frameData) {
        const frames = this.getAll();

        const newFrame = {
            id: "frame-" + crypto.randomUUID(),
            ...frameData
        };

        frames.push(newFrame);
        this.save(frames);

        return newFrame;
    }

    update(id, updatedData) {
        const frames = this.getAll();
        const index = frames.findIndex(frame => frame.id === id);

        if (index === -1) return null;

        frames[index] = {
            ...frames[index],
            ...updatedData
        };

        this.save(frames);
        return frames[index];
    }

    delete(id) {
        const frames = this.getAll();
        const filtered = frames.filter(frame => frame.id !== id);

        if (filtered.length === frames.length) return false;

        this.save(filtered);
        return true;
    }
}

const model = new FrameInventoryModel();

// ========================================
// 3. IMÁGENES: INDEXEDDB
// ========================================

const IMAGE_DB_NAME = "velocraft_images_db";
const IMAGE_STORE_NAME = "images";

function openImageDB() {

    return new Promise((resolve, reject) => {

        const request = indexedDB.open(IMAGE_DB_NAME, 1);

        request.onupgradeneeded = () => {
            const db = request.result;

            if (!db.objectStoreNames.contains(IMAGE_STORE_NAME)) {
                db.createObjectStore(IMAGE_STORE_NAME);
            }
        };

        request.onsuccess = () => resolve(request.result);

        request.onerror = () => reject(
            request.error || new Error("No se pudo abrir IndexedDB")
        );
    });
}

async function saveImage(imageId, file) {

    const db = await openImageDB();

    return new Promise((resolve, reject) => {

        const transaction = db.transaction(
            IMAGE_STORE_NAME,
            "readwrite"
        );

        const store = transaction.objectStore(IMAGE_STORE_NAME);

        store.put(file, imageId);

        transaction.oncomplete = () => {
            db.close();
            resolve();
        };

        transaction.onerror = () => {
            const error = transaction.error;
            db.close();
            reject(error);
        };
    });
}

async function getImage(imageId) {

    const db = await openImageDB();

    return new Promise((resolve, reject) => {

        const transaction = db.transaction(
            IMAGE_STORE_NAME,
            "readonly"
        );

        const request = transaction
            .objectStore(IMAGE_STORE_NAME)
            .get(imageId);

        request.onsuccess = () => {
            resolve(request.result || null);
        };

        request.onerror = () => reject(request.error);

        transaction.oncomplete = () => db.close();
    });
}

async function deleteImage(imageId) {

    const db = await openImageDB();

    return new Promise((resolve, reject) => {

        const transaction = db.transaction(
            IMAGE_STORE_NAME,
            "readwrite"
        );

        transaction.objectStore(IMAGE_STORE_NAME).delete(imageId);

        transaction.oncomplete = () => {
            db.close();
            resolve();
        };

        transaction.onerror = () => {
            const error = transaction.error;
            db.close();
            reject(error);
        };
    });
}

function validateImage(file) {

    if (!file) return;

    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    if (!allowedTypes.includes(file.type)) {
        throw new Error(
            "Seleccioná una imagen JPG, PNG o WebP."
        );
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
        throw new Error(
            "La imagen no puede superar los 5 MB."
        );
    }
}

// Obtener imagen original o imagen guardada.

async function resolveImage(frame) {

    if (!frame.imageId) {
        return {
            src: frame.image || "",
            objectUrl: false
        };
    }

    const file = await getImage(frame.imageId);

    if (!file) {
        return {
            src: frame.image || "",
            objectUrl: false
        };
    }

    return {
        src: URL.createObjectURL(file),
        objectUrl: true
    };
}

// ========================================
// 4. ELEMENTOS DE LA INTERFAZ
// ========================================

const UI = {

    catalogGrid: document.getElementById("catalogGrid"),

    searchInput: document.getElementById("searchInput"),

    sortBy: document.getElementById("sortBy"),

    filterButtons: document.querySelectorAll(
        "#materialFilters .btn-filter"
    ),

    statTotalCount: document.getElementById("statTotalCount"),

    statCarbonCount: document.getElementById("statCarbonCount"),

    statTitaniumCount: document.getElementById("statTitaniumCount"),

    statTotalValue: document.getElementById("statTotalValue"),

    addForm: document.getElementById("frameForm"),

    editForm: document.getElementById("editForm"),

    detailModal: new bootstrap.Modal(
        document.getElementById("detailModal")
    ),

    editModal: new bootstrap.Modal(
        document.getElementById("editModal")
    ),

    detailModalBody: document.getElementById("detailModalBody"),

    currentMaterialFilter: "all",

    currentSearchQuery: "",

    currentSort: "name"
};

// ========================================
// 5. FUNCIONES AUXILIARES
// ========================================

function escapeHTML(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function formatPrice(price) {

    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0
    }).format(price);
}

function showToast(message, type = "success") {

    const toastEl = document.getElementById("actionToast");

    const toastMsg = document.getElementById("toastMessage");

    const toastIcon = document.getElementById("toastIcon");

    toastEl.className = `toast custom-toast ${type}`;

    toastIcon.className = type === "success"
        ? "bi bi-check-circle-fill text-info"
        : "bi bi-info-circle-fill text-warning";

    toastMsg.textContent = message;

    bootstrap.Toast.getOrCreateInstance(
        toastEl,
        { delay: 4000 }
    ).show();
}

function getSelectedSizes(prefix) {

    return ["S", "M", "L", "XL"].filter(size => {

        const checkbox = document.getElementById(
            `${prefix}${size}`
        );

        return checkbox && checkbox.checked;
    });
}

function validateSizes(prefix, errorId) {

    const sizes = getSelectedSizes(prefix);

    document.getElementById(errorId)
        .classList.toggle("d-none", sizes.length > 0);

    return sizes;
}

// ========================================
// 6. ESTADÍSTICAS
// ========================================

function renderStats() {

    const frames = model.getAll();

    UI.statTotalCount.textContent = frames.length;

    UI.statCarbonCount.textContent = frames.filter(
        frame => frame.material === "carbon"
    ).length;

    UI.statTitaniumCount.textContent = frames.filter(
        frame => frame.material === "titanium"
    ).length;

    const totalValue = frames.reduce(
        (sum, frame) => sum + Number(frame.price || 0),
        0
    );

    UI.statTotalValue.textContent = formatPrice(totalValue);
}

// ========================================
// 7. TARJETAS DEL CATÁLOGO
// ========================================

function createCardElement(frame) {

    const isCarbon = frame.material === "carbon";

    const materialBadge = isCarbon
        ? `<span class="frame-card-badge badge-carbon">
               <i class="bi bi-cpu me-1"></i>Carbono
           </span>`
        : `<span class="frame-card-badge badge-titanium">
               <i class="bi bi-shield-shaded me-1"></i>Titanio
           </span>`;

    const sizeBadges = (frame.sizes || [])
        .map(size => `
            <span class="badge bg-secondary me-1">
                ${escapeHTML(size)}
            </span>
        `)
        .join("");

    const card = document.createElement("article");

    card.className = "col-12 col-md-6 col-xl-4 fade-in-up";

    card.id = `card-${frame.id}`;

    card.innerHTML = `
        <div class="glass-panel frame-card h-100">

            <div class="frame-card-img-wrapper">
                ${materialBadge}

                <img
                    class="frame-card-img"
                    alt="${escapeHTML(frame.name)}"
                    data-frame-image
                >
            </div>

            <div class="frame-card-body">

                <h3 class="h5 text-white mb-2">
                    ${escapeHTML(frame.name)}
                </h3>

                <div class="d-flex justify-content-between align-items-center mb-3">

                    <span class="frame-price">
                        ${formatPrice(frame.price)}
                    </span>

                    <span class="text-secondary small font-monospace">
                        <i class="bi bi-speedometer2 me-1"></i>
                        ${escapeHTML(frame.weight)} g
                    </span>
                </div>

                <p class="text-secondary small flex-grow-1 text-truncate-3-lines">
                    ${escapeHTML(frame.description)}
                </p>

                <div class="mb-3">
                    <span class="text-secondary small me-2">
                        Tallas:
                    </span>

                    ${sizeBadges}
                </div>

                <div class="d-flex gap-2 pt-2 border-top border-secondary">

                    <button
                        class="btn btn-outline-premium btn-sm flex-grow-1"
                        data-action="details"
                        type="button"
                    >
                        <i class="bi bi-eye"></i> Detalles
                    </button>

                    <button
                        class="btn btn-warning btn-sm text-dark"
                        data-action="edit"
                        type="button"
                        title="Editar"
                    >
                        <i class="bi bi-pencil"></i>
                    </button>

                    <button
                        class="btn btn-danger btn-sm"
                        data-action="delete"
                        type="button"
                        title="Eliminar"
                    >
                        <i class="bi bi-trash"></i>
                    </button>

                </div>
            </div>
        </div>
    `;

    card.querySelector('[data-action="details"]')
        .addEventListener("click", () => viewDetails(frame.id));

    card.querySelector('[data-action="edit"]')
        .addEventListener("click", () => openEditModal(frame.id));

    card.querySelector('[data-action="delete"]')
        .addEventListener("click", () => deleteFrame(frame.id));

    const image = card.querySelector("[data-frame-image]");

    loadFrameImage(image, frame);

    return card;
}

// ========================================
// 8. MOSTRAR IMÁGENES
// ========================================

async function loadFrameImage(imageElement, frame) {

    let objectUrl = null;

    try {

        const result = await resolveImage(frame);

        if (!imageElement.isConnected) {
            if (result.objectUrl) {
                URL.revokeObjectURL(result.src);
            }
            return;
        }

        objectUrl = result.objectUrl ? result.src : null;

        imageElement.src = result.src || createPlaceholder(frame.name);

    } catch (error) {

        console.error("Error cargando imagen:", error);

        imageElement.src = frame.image || createPlaceholder(frame.name);
    }

    imageElement.onerror = () => {

        if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
            objectUrl = null;
        }

        imageElement.onerror = null;
        imageElement.src = createPlaceholder(frame.name);
    };

    // Liberar URL temporal al terminar de usar la imagen.
    if (objectUrl) {

        const urlToRelease = objectUrl;

        const observer = new MutationObserver(() => {

            if (!imageElement.isConnected) {
                URL.revokeObjectURL(urlToRelease);
                observer.disconnect();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
}

function createPlaceholder(name) {

    const text = encodeURIComponent(name || "Sin imagen");

    return `https://placehold.co/600x400/22241e/ffffff?text=${text}`;
}

// ========================================
// 9. RENDERIZAR CATÁLOGO
// ========================================

function renderCatalog() {

    let frames = model.getAll();

    if (UI.currentMaterialFilter !== "all") {

        frames = frames.filter(
            frame => frame.material === UI.currentMaterialFilter
        );
    }

    if (UI.currentSearchQuery.trim() !== "") {

        const query = UI.currentSearchQuery.toLowerCase();

        frames = frames.filter(frame => {

            const name = String(frame.name || "").toLowerCase();

            const description = String(
                frame.description || ""
            ).toLowerCase();

            return name.includes(query) ||
                   description.includes(query);
        });
    }

    frames.sort((a, b) => {

        switch (UI.currentSort) {

            case "price-asc":
                return a.price - b.price;

            case "price-desc":
                return b.price - a.price;

            case "weight":
                return a.weight - b.weight;

            default:
                return a.name.localeCompare(b.name);
        }
    });

    UI.catalogGrid.replaceChildren();

    if (frames.length === 0) {

        UI.catalogGrid.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="bi bi-search-heart fs-1 text-secondary d-block mb-3"></i>

                <h4 class="text-secondary">
                    No se encontraron cuadros
                </h4>

                <p class="text-secondary-50">
                    Intentá cambiar la búsqueda o los filtros.
                </p>
            </div>
        `;

        return;
    }

    frames.forEach(frame => {

        UI.catalogGrid.appendChild(
            createCardElement(frame)
        );
    });
}

// ========================================
// 10. VER DETALLES
// ========================================

window.viewDetails = function(id) {

    const frame = model.getById(id);

    if (!frame) return;

    const isCarbon = frame.material === "carbon";

    const materialText = isCarbon
        ? "Fibra de Carbono (Toray T1100 Aero)"
        : "Titanio Grado 9 (Ti-3Al-2.5V)";

    const materialClass = isCarbon
        ? "text-info"
        : "text-warning";

    UI.detailModalBody.innerHTML = `
        <div class="row g-4">

            <div class="col-12 col-md-5">
                <img
                    data-detail-image
                    alt="${escapeHTML(frame.name)}"
                    class="img-fluid rounded border border-secondary"
                >
            </div>

            <div class="col-12 col-md-7">

                <h4 class="text-white h3 mb-2">
                    ${escapeHTML(frame.name)}
                </h4>

                <p class="h4 ${materialClass} mb-3 font-monospace">
                    ${formatPrice(frame.price)}
                </p>

                <div class="mb-4">

                    <span class="badge bg-secondary p-2 me-2">
                        ${escapeHTML(frame.material.toUpperCase())}
                    </span>

                    <span class="badge bg-dark border border-secondary p-2">
                        <i class="bi bi-speedometer2 me-1"></i>
                        ${escapeHTML(frame.weight)} gramos
                    </span>
                </div>

                <h5 class="h6 text-secondary text-uppercase font-monospace mb-2">
                    Descripción Técnica
                </h5>

                <p class="text-secondary-50 mb-4">
                    ${escapeHTML(frame.description)}
                </p>

                <div class="row g-2 border-top border-secondary pt-3">

                    <div class="col-6">
                        <span class="text-secondary small d-block font-monospace">
                            MATERIAL
                        </span>

                        <strong class="text-white">
                            ${materialText}
                        </strong>
                    </div>

                    <div class="col-6">
                        <span class="text-secondary small d-block font-monospace">
                            TALLAS EN STOCK
                        </span>

                        <strong class="text-white">
                            ${escapeHTML((frame.sizes || []).join(", "))}
                        </strong>
                    </div>
                </div>
            </div>
        </div>
    `;

    UI.detailModal.show();

    loadFrameImage(
        UI.detailModalBody.querySelector("[data-detail-image]"),
        frame
    );
};

// ========================================
// 11. ABRIR FORMULARIO DE EDICIÓN
// ========================================

window.openEditModal = function(id) {

    const frame = model.getById(id);

    if (!frame) return;

    document.getElementById("editFrameId").value = frame.id;

    document.getElementById("editFrameName").value = frame.name;

    document.getElementById("editFrameMaterial").value = frame.material;

    document.getElementById("editFrameWeight").value = frame.weight;

    document.getElementById("editFramePrice").value = frame.price;

    document.getElementById("editFrameDescription").value =
        frame.description;

    // IMPORTANTE:
    // Un input file no permite asignarle una ruta.
    // Lo dejamos vacío para conservar la imagen actual
    // cuando el usuario no selecciona otra.

    document.getElementById("editFrameImage").value = "";

    ["S", "M", "L", "XL"].forEach(size => {

        const checkbox = document.getElementById(
            `editSize${size}`
        );

        checkbox.checked = (frame.sizes || []).includes(size);
    });

    UI.editForm.classList.remove("was-validated");

    document.getElementById("editSizeValidationError")
        .classList.add("d-none");

    UI.editModal.show();
};

// ========================================
// 12. ELIMINAR PRODUCTO
// ========================================

window.deleteFrame = async function(id) {

    const frame = model.getById(id);

    if (!frame) return;

    const confirmed = confirm(
        `¿Estás seguro de eliminar "${frame.name}"?`
    );

    if (!confirmed) return;

    try {

        // Borrar primero los datos del producto.
        const deleted = model.delete(id);

        if (!deleted) return;

        // Si tenía una imagen propia, intentar borrarla.
        if (frame.imageId) {

            try {
                await deleteImage(frame.imageId);
            } catch (error) {
                console.warn(
                    "No se pudo eliminar la imagen almacenada:",
                    error
                );
            }
        }

        renderCatalog();
        renderStats();

        showToast(
            `Cuadro "${frame.name}" eliminado correctamente.`,
            "info"
        );

    } catch (error) {

        console.error(error);

        showToast(
            "No se pudo eliminar el producto.",
            "error"
        );
    }
};

// ========================================
// 13. AGREGAR PRODUCTO
// ========================================

UI.addForm.addEventListener("submit", async function(event) {

    event.preventDefault();

    const selectedSizes = validateSizes(
        "size",
        "sizeValidationError"
    );

    if (!UI.addForm.checkValidity() || selectedSizes.length === 0) {

        UI.addForm.classList.add("was-validated");

        return;
    }

    const imageInput = document.getElementById("frameImage");

    const file = imageInput.files[0];

    let imageId = null;

    const saveButton = document.getElementById("btnSaveFrame");

    saveButton.disabled = true;

    try {

        validateImage(file);

        if (file) {

            imageId = "image-" + crypto.randomUUID();

            await saveImage(imageId, file);
        }

        const frameData = {

            name: document.getElementById("frameName").value.trim(),

            material: document.getElementById("frameMaterial").value,

            weight: Number(
                document.getElementById("frameWeight").value
            ),

            price: Number(
                document.getElementById("framePrice").value
            ),

            sizes: selectedSizes,

            description: document.getElementById(
                "frameDescription"
            ).value.trim(),

            image: "",

            imageId: imageId
        };

        const newFrame = model.create(frameData);

        UI.addForm.reset();

        UI.addForm.classList.remove("was-validated");

        renderCatalog();
        renderStats();

        showToast(
            `Cuadro "${newFrame.name}" agregado con éxito.`
        );

        if (window.innerWidth < 992) {

            const panel = document.getElementById("managerPanel");

            const collapse = bootstrap.Collapse.getInstance(panel);

            if (collapse) collapse.hide();
        }

    } catch (error) {

        console.error(error);

        // Evitar dejar una imagen huérfana si falló
        // el guardado de los datos del producto.
        if (imageId) {
            try {
                await deleteImage(imageId);
            } catch (_) {}
        }

        showToast(
            error.message || "No se pudo guardar el producto.",
            "error"
        );

    } finally {

        saveButton.disabled = false;
    }
});

// ========================================
// 14. ACTUALIZAR PRODUCTO
// ========================================

UI.editForm.addEventListener("submit", async function(event) {

    event.preventDefault();

    const id = document.getElementById("editFrameId").value;

    const frame = model.getById(id);

    if (!frame) {
        showToast("No se encontró el producto.", "error");
        return;
    }

    const selectedSizes = validateSizes(
        "editSize",
        "editSizeValidationError"
    );

    if (!UI.editForm.checkValidity() || selectedSizes.length === 0) {

        UI.editForm.classList.add("was-validated");

        return;
    }

    const imageInput = document.getElementById("editFrameImage");

    const file = imageInput.files[0];

    const updateButton = document.getElementById("btnUpdateFrame");

    updateButton.disabled = true;

    let newImageId = null;

    try {

        validateImage(file);

        const updatedData = {

            name: document.getElementById(
                "editFrameName"
            ).value.trim(),

            material: document.getElementById(
                "editFrameMaterial"
            ).value,

            weight: Number(
                document.getElementById("editFrameWeight").value
            ),

            price: Number(
                document.getElementById("editFramePrice").value
            ),

            sizes: selectedSizes,

            description: document.getElementById(
                "editFrameDescription"
            ).value.trim()
        };

        // Solo modificar la imagen si se eligió otra.
        if (file) {

            newImageId = "image-" + crypto.randomUUID();

            await saveImage(newImageId, file);

            updatedData.imageId = newImageId;
        }

        const updatedFrame = model.update(id, updatedData);

        if (!updatedFrame) {
            throw new Error("No se pudo actualizar el producto.");
        }

        // La imagen anterior se elimina después
        // de guardar correctamente la nueva.
        if (file && frame.imageId) {

            try {
                await deleteImage(frame.imageId);
            } catch (error) {
                console.warn(
                    "No se pudo eliminar la imagen anterior:",
                    error
                );
            }
        }

        UI.editModal.hide();

        UI.editForm.reset();

        renderCatalog();
        renderStats();

        showToast(
            `Cuadro "${updatedFrame.name}" actualizado correctamente.`
        );

    } catch (error) {

        console.error(error);

        if (newImageId) {

            try {
                await deleteImage(newImageId);
            } catch (_) {}
        }

        showToast(
            error.message || "No se pudo actualizar el producto.",
            "error"
        );

    } finally {

        updateButton.disabled = false;
    }
});

// ========================================
// 15. BUSCADOR
// ========================================

UI.searchInput.addEventListener("input", function() {

    UI.currentSearchQuery = this.value;

    renderCatalog();
});

// ========================================
// 16. ORDENAR
// ========================================

UI.sortBy.addEventListener("change", function() {

    UI.currentSort = this.value;

    renderCatalog();
});

// ========================================
// 17. FILTROS
// ========================================

UI.filterButtons.forEach(button => {

    button.addEventListener("click", function() {

        UI.filterButtons.forEach(btn => {
            btn.classList.remove("active");
        });

        this.classList.add("active");

        UI.currentMaterialFilter = this.dataset.material;

        renderCatalog();
    });
});

// ========================================
// 18. VALIDACIÓN DE TALLAS
// ========================================

const checkboxSelectors = [
    "sizeS",
    "sizeM",
    "sizeL",
    "sizeXL",
    "editSizeS",
    "editSizeM",
    "editSizeL",
    "editSizeXL"
];

checkboxSelectors.forEach(id => {

    const checkbox = document.getElementById(id);

    if (!checkbox) return;

    checkbox.addEventListener("change", () => {

        const isEdit = id.startsWith("edit");

        const prefix = isEdit ? "editSize" : "size";

        const errorId = isEdit
            ? "editSizeValidationError"
            : "sizeValidationError";

        validateSizes(prefix, errorId);
    });
});

// ========================================
// 19. INICIALIZACIÓN
// ========================================

// El script se carga al final del body,
// por lo que los elementos HTML ya existen.

renderCatalog();
renderStats();

console.log("VeloCraft iniciado correctamente.");


/*
 * ==========================================
 * VELOCRAFT - VISTA PREVIA DE IMÁGENES
 * ==========================================
 *
 * Permite visualizar una fotografía antes
 * de guardar o actualizar un producto.
 *
 * No modifica localStorage ni IndexedDB.
 */

// Crear la vista previa automáticamente.
function configurarVistaPrevia(inputId) {

    const input = document.getElementById(inputId);

    if (!input) {
        console.error(
            "No se encontró el campo de imagen:",
            inputId
        );
        return;
    }

    // Identificador de la vista previa.
    const previewId = "preview-" + inputId;

    // Buscar si la imagen ya existe.
    let preview = document.getElementById(previewId);

    // Si no existe, crearla automáticamente.
    if (!preview) {

        preview = document.createElement("img");

        preview.id = previewId;

        preview.className =
            "img-fluid rounded mt-3 d-none";

        preview.alt =
            "Vista previa de la fotografía seleccionada";

        preview.style.maxWidth = "100%";
        preview.style.maxHeight = "200px";
        preview.style.objectFit = "contain";

        // Insertar la fotografía debajo del selector.
        input.insertAdjacentElement(
            "afterend",
            preview
        );
    }

    // Guardar la dirección temporal de la imagen.
    let urlTemporal = null;

    // Limpiar la vista previa.
    function limpiarVistaPrevia() {

        if (urlTemporal) {
            URL.revokeObjectURL(urlTemporal);
            urlTemporal = null;
        }

        preview.removeAttribute("src");
        preview.classList.add("d-none");
    }

    // Detectar cuando se selecciona una fotografía.
    input.addEventListener("change", function () {

        limpiarVistaPrevia();

        const archivo = input.files[0];

        // Si no seleccionamos nada, no mostrar imagen.
        if (!archivo) {
            return;
        }

        // Comprobar el formato.
        const tiposPermitidos = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (!tiposPermitidos.includes(archivo.type)) {

            alert(
                "Seleccioná una imagen JPG, PNG o WebP."
            );

            input.value = "";

            return;
        }

        // Comprobar el tamaño máximo de 5 MB.
        const tamañoMaximo = 5 * 1024 * 1024;

        if (archivo.size > tamañoMaximo) {

            alert(
                "La fotografía no puede superar los 5 MB."
            );

            input.value = "";

            return;
        }

        // Crear una dirección temporal.
        urlTemporal = URL.createObjectURL(archivo);

        // Mostrar la fotografía.
        preview.src = urlTemporal;

        preview.classList.remove("d-none");

        console.log(
            "Vista previa cargada:",
            archivo.name
        );
    });

    // Devolver la función para limpiar.
    return limpiarVistaPrevia;
}


// ==========================================
// VISTA PREVIA AL AGREGAR UN CUADRO
// ==========================================

const limpiarPreviewAgregar = configurarVistaPrevia(
    "frameImage"
);


// ==========================================
// VISTA PREVIA AL EDITAR UN CUADRO
// ==========================================

const limpiarPreviewEditar = configurarVistaPrevia(
    "editFrameImage"
);


// ==========================================
// LIMPIAR AL REINICIAR EL FORMULARIO
// ==========================================

UI.addForm.addEventListener("reset", function () {

    if (limpiarPreviewAgregar) {
        limpiarPreviewAgregar();
    }
});


// ==========================================
// LIMPIAR AL ABRIR LA VENTANA DE EDICIÓN
// ==========================================

document.getElementById("editModal")
    .addEventListener("show.bs.modal", function () {

        if (limpiarPreviewEditar) {
            limpiarPreviewEditar();
        }
    });


// ==========================================
// LIMPIAR AL CERRAR LA VENTANA DE EDICIÓN
// ==========================================

document.getElementById("editModal")
    .addEventListener("hidden.bs.modal", function () {

        if (limpiarPreviewEditar) {
            limpiarPreviewEditar();
        }
    });

console.log(
    "Vista previa de imágenes activada correctamente."
);
