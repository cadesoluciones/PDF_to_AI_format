import axios from 'axios';
import type { ConversionOptionMode, ConversionResponse } from '~/features/conversion/conversionTypes';

// URL base del backend. En local usa localhost; en otros entornos puede venir de VITE_API_URL.
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';

// Normaliza errores de Axios para que la UI muestre el mensaje del backend cuando exista.
function getRequestError(error: unknown) {
    if (axios.isAxiosError(error)) {
        const responseError = error.response?.data as { error?: string } | undefined;
        return responseError?.error || error.message;
    }

    return error instanceof Error ? error.message : 'Error al procesar la conversion.';
}

// Envia un unico PDF. El nombre "file" debe coincidir con upload.single('file') en server/index.js.
export async function transformFile(file: File, mode: ConversionOptionMode): Promise<ConversionResponse> {
    const formData = new FormData();
    // IM--El archivo se añade con la clave "file" porque el backend lo recibe con upload.single('file')--
    formData.append("file", file);
    // mode indica al backend si debe convertir el PDF a JSON o a Markdown.
    formData.append("mode", mode);

    try {
        // Axios maneja automáticamente los headers para FormData
        const response = await axios.post<ConversionResponse>(`${API_URL}/transformfile`, formData);
        // La respuesta de éxito siempre está en response.data
        return response.data;
    } catch (error) {
        throw new Error(getRequestError(error));
    }
}

// Envia varios PDFs. El nombre "files" debe coincidir con upload.array('files') en server/index.js
export async function transformFiles(files: File[], mode: ConversionOptionMode): Promise<ConversionResponse> {
    // FormData permite enviar varios archivos en una misma petición multipart/form-data.
    const formData = new FormData();

    // IM--Cada PDF se añade con la misma clave "files" para que Multer los reciba como array--
    files.forEach((file) => {
        formData.append("files", file);
    });

    // mode indica al backend si debe convertir todos los PDFs a JSON o a Markdown
    formData.append("mode", mode);

    try {
        // Axios maneja automáticamente los headers para FormData
        const response = await axios.post<ConversionResponse>(`${API_URL}/transformfiles`, formData);
        // La respuesta de éxito siempre está en response.data.
        return response.data;
    } catch (error) {
        throw new Error(getRequestError(error));
    }
}
