import { fetchAPI } from './api.js';

document.addEventListener("DOMContentLoaded", () => {
    // Si ya hay sesión, redirigir al index
    if (localStorage.getItem("userSession")) {
        window.location.href = "index.html";
        return;
    }

    const form = document.getElementById("formLogin");
    const msg = document.getElementById("login-msg");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const nombre_usuario = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value;

        try {
            const response = await fetchAPI("/auth/login", "POST", { nombre_usuario, password });
            
            if (response.success) {
                // Guardar la sesión y redirigir
                localStorage.setItem("userSession", JSON.stringify(response.user));
                window.location.href = "index.html";
            }
        } catch (error) {
            msg.textContent = error.message || "Usuario o contraseña incorrectos.";
            msg.style.color = "#ef4444"; // red-500
            msg.style.display = "block";
        }
    });
});
