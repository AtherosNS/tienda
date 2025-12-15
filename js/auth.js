async function login() {
    let email = document.getElementById("email").value;
    let pass = document.getElementById("password").value;

    let resp = await api("login", { email, password: pass });

    if (!resp.success) {
        document.getElementById("loginError").innerText = "Credenciales incorrectas";
        return;
    }

    localStorage.setItem("user", JSON.stringify(resp.user));

    if (resp.user.rol === "ADMIN") {
        window.location.href = "admin-dashboard.html";
    } else {
        window.location.href = "empleado-dashboard.html";
    }
}
