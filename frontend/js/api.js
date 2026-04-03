export const API_URL = "http://localhost:3000/api";

export function checkAuth() {
    // Evitar loop infinito si ya estamos en el login
    const isLoginPage = window.location.pathname.includes('login.html');
    const session = localStorage.getItem("userSession");

    if (!session && !isLoginPage) {
        window.location.replace("/login.html");
    }
}

// Cerrar sesión
export function logout() {
    localStorage.removeItem("userSession");
    window.location.replace("/login.html");
}

// Vincular automáticamente el botón de cerrar sesión
document.addEventListener('DOMContentLoaded', () => {
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
});

// Ejecutar revisión automática excepto si estamos en el archivo utils
// Realizaremos la ejecución inmediata:
checkAuth();

export async function fetchAPI(endpoint, method = "GET", body = null) {
    const options = {
        method,
        headers: {
            "Content-Type": "application/json"
        }
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${API_URL}${endpoint}`, options);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || errorData.message || "Error en la petición");
        }
        return await response.json();
    } catch (error) {
        console.error("Error API:", error);
        throw error;
    }
}