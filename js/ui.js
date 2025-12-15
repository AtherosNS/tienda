// SPA simple para el LOGIN (index.html)
async function cargarVista(ruta, contenedorId = "content") {
    try {
        const res = await fetch(ruta);
        if (!res.ok) {
            console.error("❌ Error al cargar vista:", ruta);
            return;
        }
        const html = await res.text();
        const cont = document.getElementById(contenedorId);
        if (!cont) return;
        cont.innerHTML = html;

        // Avisamos que una vista terminó de cargar (para login.js)
        document.dispatchEvent(new Event("vista-cargada"));
    } catch (err) {
        console.error("❌ Error cargarVista:", err);
    }
}

// Toast simple
function toast(msg) {
    const t = document.createElement("div");
    t.className = "toast";
    t.innerText = msg;

    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

// Dark mode
function toggleDarkMode() {
    document.body.classList.toggle("dark");
    const enabled = document.body.classList.contains("dark");
    localStorage.setItem("darkMode", enabled ? "true" : "false");
}

// Aplicar dark mode guardado
window.addEventListener("load", () => {
    const enabled = localStorage.getItem("darkMode") === "true";
    if (enabled) {
        document.body.classList.add("dark");
    }
});
