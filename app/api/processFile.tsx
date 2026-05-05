import axios from 'axios';

const API_URL = "http://localhost:3001/api";

export async function transformFile(file: File, mode: 'json' | 'markdown') {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("mode", mode);

    // Axios maneja automáticamente los headers para FormData
    const response = await axios.post(`${API_URL}/transformfile`, formData);

    // La respuesta de éxito siempre está en response.data
    return response.data;
}