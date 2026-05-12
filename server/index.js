import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { convert } from '@opendataloader/pdf';
import fs from 'fs/promises';
import path from 'path';
import { tmpdir } from 'os';

const app = express();
const PORT = 3001;
const isDevelopment = process.env.NODE_ENV !== 'production'; // Habilita logs técnicos únicamente fuera de producción.
const MAX_FILE_SIZE = 25 * 1024 * 1024; // Tamaño máximo permitido por PDF: 25 MB.
const MAX_FILES = 20; // Número máximo de PDFs aceptados por petición múltiple.

// Middlewares globales: habilitan llamadas desde el frontend y lectura de cuerpos JSON auxiliares.
app.use(cors());
app.use(express.json());

// Multer recibe los PDFs en memoria; la conversión posterior los escribe en archivos temporales controlados.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES,
  },
  fileFilter: (req, file, callback) => {
    // Validación temprana para descartar archivos que no sean PDFs antes de invocar la librería de conversión.
    const isPdf =
      file.mimetype === 'application/pdf' ||
      file.originalname.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      callback(new Error('Solo se permiten archivos PDF.'));
      return;
    }

    callback(null, true);
  },
});

// Valida el modo solicitado por el frontend. Solo se aceptan los formatos expuestos por la interfaz.
function getValidMode(mode) {
  return mode === 'json' || mode === 'markdown' ? mode : null;
}

// Algunos resultados JSON pueden llegar como texto; si no se pueden parsear, se conserva el contenido original.
function safeParseJson(content) {
  try {
    return JSON.parse(content);
  } catch {
    return content;
  }
}

// Normaliza errores desconocidos en un mensaje seguro para responder a la interfaz.
function getErrorMessage(error) {
  return error instanceof Error ? error.message : 'Error al procesar el archivo.';
}

// Estructura única para respuestas de error HTTP generadas por la API.
function sendError(res, status, message) {
  return res.status(status).json({
    success: false,
    error: message,
  });
}

// Markdown intenta conservar imágenes; JSON utiliza el formato base de la librería.
function getConvertFormat(mode) {
  return mode === 'markdown' ? 'markdown-with-images' : 'json';
}

// OpenDataLoader puede generar PNG o JPG; este helper asigna el MIME correcto para data URI.
function getMimeTypeByExtension(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return extension === '.jpg' || extension === '.jpeg' ? 'image/jpeg' : 'image/png';
}

// Recorre la carpeta de salida y convierte imágenes generadas en assets base64 consumibles por el frontend.
async function collectImageAssets(outputDir) {
  const assets = [];

  async function readDirectory(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        // Las imágenes pueden generarse en subcarpetas, por eso se recorre la salida de forma recursiva.
        await readDirectory(entryPath);
        continue;
      }

      if (!/\.(png|jpe?g)$/i.test(entry.name)) {
        continue;
      }

      const buffer = await fs.readFile(entryPath);
      const relativePath = path.relative(outputDir, entryPath).replaceAll(path.sep, '/');
      const mimeType = getMimeTypeByExtension(entryPath);

      assets.push({
        fileName: entry.name,
        path: relativePath,
        mimeType,
        dataUri: `data:${mimeType};base64,${buffer.toString('base64')}`,
      });
    }
  }

  await readDirectory(outputDir);
  return assets;
}

// Limpia y recrea la salida antes de reintentar una conversión sin extracción de imágenes.
async function resetOutputDirectory(outputDir, imageDir) {
  await fs.rm(outputDir, { recursive: true, force: true }).catch(() => {});
  await fs.mkdir(outputDir, { recursive: true });
  await fs.mkdir(imageDir, { recursive: true });
}

// Sustituye referencias a imágenes dentro del Markdown por data URI embebidas.
function embedImagesInMarkdown(content, assets) {
  return assets.reduce((nextContent, asset) => {
    const escapedPath = asset.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedFileName = asset.fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pathPattern = new RegExp(escapedPath, 'g');
    const fileNamePattern = new RegExp(`(?<![\\w./-])${escapedFileName}(?![\\w./-])`, 'g');

    return nextContent
      .replace(pathPattern, asset.dataUri)
      .replace(fileNamePattern, asset.dataUri);
  }, content);
}

// Primer intento con imágenes; si falla, se reintenta sin imágenes para conservar al menos el texto.
async function convertWithImageFallback(tempFilePath, tempOutputDirPath, tempImageDirPath, mode) {
  try {
    await convert([tempFilePath], {
      outputDir: tempOutputDirPath,
      format: getConvertFormat(mode),
      imageOutput: 'external',
      imageFormat: 'png',
      imageDir: tempImageDirPath,
    });
  } catch (error) {
    console.warn('No se pudieron extraer imágenes. Reintentando sin imágenes:', getErrorMessage(error));

    await resetOutputDirectory(tempOutputDirPath, tempImageDirPath);

    await convert([tempFilePath], {
      outputDir: tempOutputDirPath,
      format: mode,
      imageOutput: 'off',
    });
  }
}

// Función central de conversión compartida por el endpoint individual y el endpoint múltiple.
async function convertPdfBuffer(file, mode) {
  let tempFilePath = null;
  let tempOutputDirPath = null;

  try {
    // Nombre único para evitar colisiones entre conversiones simultáneas en la carpeta temporal.
    const tempName = `pdf_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const extension = mode === 'json' ? '.json' : '.md';
    const tempImageDirName = `${tempName}_images`;

    tempFilePath = path.join(tmpdir(), `${tempName}.pdf`);
    tempOutputDirPath = path.join(tmpdir(), `${tempName}_out`);
    const tempImageDirPath = path.join(tempOutputDirPath, tempImageDirName);

    // La librería trabaja con rutas de archivo; por eso el buffer de Multer se persiste temporalmente.
    await fs.writeFile(tempFilePath, file.buffer);
    await fs.mkdir(tempOutputDirPath, { recursive: true });
    await fs.mkdir(tempImageDirPath, { recursive: true });

    if (isDevelopment) {
      console.log(`Operando en: ${tempFilePath}`);
      console.log(`Formato seleccionado: ${mode}`);
    }

    await convertWithImageFallback(tempFilePath, tempOutputDirPath, tempImageDirPath, mode);

    // Después de convertir, se localiza el archivo principal generado según el modo solicitado.
    const filesInOutput = await fs.readdir(tempOutputDirPath);
    if (isDevelopment) {
      console.log('Archivos generados en salida:', filesInOutput);
    }

    if (filesInOutput.length === 0) {
      throw new Error('La librería no generó archivos. Revisa si el PDF tiene texto legible.');
    }

    const resultFile =
      filesInOutput.find((fileName) => fileName.toLowerCase().endsWith(extension)) ||
      filesInOutput[0];

    const originalBase = file.originalname ? path.parse(file.originalname).name : tempName;
    const finalContent = await fs.readFile(path.join(tempOutputDirPath, resultFile), 'utf-8');
    const assets = await collectImageAssets(tempOutputDirPath);

    // JSON conserva contenido estructurado y assets; Markdown intenta quedar como texto autocontenido.
    const parsedData = mode === 'json'
      ? {
          content: safeParseJson(finalContent),
          assets,
        }
      : embedImagesInMarkdown(finalContent, assets);

    return {
      success: true,
      originalName: file.originalname,
      fileName: `${originalBase}${extension}`,
      data: parsedData,
      assets,
    };
  } finally {
    // Limpieza obligatoria para no dejar PDFs ni salidas temporales en disco.
    if (tempFilePath) {
      await fs.unlink(tempFilePath).catch(() => {});
    }
    if (tempOutputDirPath) {
      await fs.rm(tempOutputDirPath, { recursive: true, force: true }).catch(() => {});
    }
  }
}

// Conversión individual: siempre devuelve results con un solo item para mantener un contrato uniforme.
app.post('/api/transformfile', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const mode = getValidMode(req.body.mode);

    if (!file) {
      return sendError(res, 400, 'No hay un PDF cargado para procesar.');
    }

    if (!mode) {
      return sendError(res, 400, 'Modo de conversión no válido. Usa "json" o "markdown".');
    }

    const result = await convertPdfBuffer(file, mode);

    return res.json({
      success: true,
      mode,
      results: [result],
    });
  } catch (error) {
    console.error('Error detallado:', error);
    return sendError(res, 500, getErrorMessage(error));
  }
});

// Conversión múltiple/carpeta: procesa cada PDF y conserva success/error por archivo.
app.post('/api/transformfiles', upload.array('files', MAX_FILES), async (req, res) => {
  try {
    const files = Array.isArray(req.files) ? req.files : [];
    const mode = getValidMode(req.body.mode);

    if (files.length === 0) {
      return sendError(res, 400, 'No hay PDFs cargados para procesar.');
    }

    if (!mode) {
      return sendError(res, 400, 'Modo de conversión no válido. Usa "json" o "markdown".');
    }

    const results = [];

    for (const file of files) {
      try {
        // El procesamiento secuencial controla memoria y permite aislar fallos por documento.
        const result = await convertPdfBuffer(file, mode);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          originalName: file.originalname,
          error: getErrorMessage(error),
        });
      }
    }

    const hasSuccess = results.some((result) => result.success);

    return res.json({
      success: hasSuccess,
      mode,
      results,
      error: hasSuccess ? undefined : 'No se pudo convertir ningún PDF.',
    });
  } catch (error) {
    console.error('Error detallado:', error);
    return sendError(res, 500, getErrorMessage(error));
  }
});

// Captura errores de Multer y validación para responder JSON en lugar de HTML genérico.
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    return sendError(res, 400, error.message);
  }

  if (error) {
    return sendError(res, 400, getErrorMessage(error));
  }

  return next();
});

app.listen(PORT, () => {
  console.log(`Servidor activo en http://localhost:${PORT}`);
});
