// Esta función se ejecuta cada vez que se carga la vista login
function inicializarLogin() {
    const form = document.getElementById("formLogin");
    if (!form) return; // vista aún no cargada

    // Evitamos enlazar doble vez
    if (form.dataset.bound === "true") return;

    form.dataset.bound = "true";

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value.trim();

        const data = await apiCall({
            action: "login",
            email: email,
            password: password
        });

        if (!data.success) {
            alert("❌ Usuario o contraseña incorrecta");
            return;
        }

        localStorage.setItem("user", JSON.stringify(data.user));

        if (data.user.rol === "ADMIN") {
            window.location.href = "admin-dashboard.html";
        } else {
            window.location.href = "empleado-dashboard.html";
        }
    });
}

// Detectamos cuando cargarVista termina
document.addEventListener("vista-cargada", () => {
    inicializarLogin();
});
