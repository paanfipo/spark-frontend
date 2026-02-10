export const consultarEntrenadorIA = async (metricas) => {
    const url = "http://localhost:8000/entrenador/analizar";
    const token = localStorage.getItem("token");

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(metricas)
        });
        return await response.json();
    } catch (error) {
        console.error("Error en el servicio de IA:", error);
        return null;
    }
};