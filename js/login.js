// Esta función se ejecuta cada vez que se carga la vista login
function inicializarLogin() {
    const form = document.getElementById("formLogin");
    if (!form) return; // vista aún no cargada

    // Evitamos enlazar doble vez
    if (form.dataset.bound === "true") return;

    form.dataset.bound = "true";

    // ========== TOGGLE PASSWORD ==========
    const toggleBtn = document.getElementById("togglePassword");
    const passwordInput = document.getElementById("password");
    const eyeIcon = document.getElementById("eyeIcon");

    if (toggleBtn && passwordInput && eyeIcon) {
        toggleBtn.addEventListener("click", function() {
            if (passwordInput.type === "password") {
                passwordInput.type = "text";
                eyeIcon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"></path><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"></path><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
            } else {
                passwordInput.type = "password";
                eyeIcon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
            }
        });
    }

    // ========== FORM SUBMIT ==========
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