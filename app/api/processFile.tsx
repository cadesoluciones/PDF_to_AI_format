import axios from 'axios';
import type { ConversionOptionMode, ConversionResponse } from '~/features/conversion/conversionTypes';

// URL base de la API. En desarrollo apunta al backend local y en despliegues puede sobrescribirse con VITE_API_URL.
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';

// Normaliza errores de Axios para que la interfaz muestre el mensaje enviado por el backend cuando esté disponible.
function getRequestError(error: unknown) {
    if (axios.isAxiosError(error)) {
        const responseError = error.response?.data as { error?: string } | undefined;
        return responseError?.error || error.message;
    }

    return error instanceof Error ? error.message : 'Error al procesar la conversión.';
}

// Envía un único PDF al endpoint individual. La clave "file" debe coincidir con upload.single('file') en el backend.
export async function transformFile(file: File, mode: ConversionOptionMode): Promise<ConversionResponse> {
    const formData = new FormData();

    // El archivo viaja con la clave "file" para que Multer lo reciba como carga individual.
    formData.append("file", file);

    // El modo indica al backend si la conversión debe generar JSON o Markdown.
    formData.append("mode", mode);

    try {
        // Axios configura automáticamente las cabeceras multipart/form-data al recibir FormData.
        const response = await axios.post<ConversionResponse>(`${API_URL}/transformfile`, formData);

        // La respuesta tipada del backend queda disponible en response.data.
        return response.data;
    } catch (error) {
        throw new Error(getRequestError(error));
    }
}

// Envía varios PDFs al endpoint de carpeta. La clave "files" debe coincidir con upload.array('files') en el backend.
export async function transformFiles(files: File[], mode: ConversionOptionMode): Promise<ConversionResponse> {
    const formData = new FormData();

    // Cada PDF se adjunta con la misma clave para que Multer construya el array de archivos.
    files.forEach((file) => {
        formData.append("files", file);
    });

    // El modo se aplica a todos los PDFs incluidos en la petición.
    formData.append("mode", mode);

    try {
        // Axios configura automáticamente las cabeceras multipart/form-data al recibir FormData.
        const response = await axios.post<ConversionResponse>(`${API_URL}/transformfiles`, formData);

        // La respuesta tipada del backend queda disponible en response.data.
        return response.data;
    } catch (error) {
        throw new Error(getRequestError(error));
    }
}
