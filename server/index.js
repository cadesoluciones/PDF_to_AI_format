import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { convert } from '@opendataloader/pdf';
import fs from 'fs/promises';
import path from 'path';
import { tmpdir } from 'os';

const app = express();
const PORT = 3001;
const isDevelopment = process.env.NODE_ENV !== 'production';
const MAX_FILE_SIZE = 25 * 1024 * 1024; //Maximo de tamaño del archivo 
const MAX_FILES = 20; //Maximo de ficheros acatuales 

// CORS permite que el frontend en otro puerto pueda llamar a esta API local.
app.use(cors());
app.use(express.json());

// Multer recibe los PDFs en memoria; despues convertPdfBuffer los escribe como temporales.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES,
  },
  fileFilter: (req, file, callback) => {
    // Validacion temprana: evita intentar convertir archivos que no sean PDF.
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

// El backend solo acepta estos dos modos; cualquier otro valor se rechaza.
function getValidMode(mode) {
  return mode === 'json' || mode === 'markdown' ? mode : null;
}

// Algunos resultados JSON pueden venir como texto; si no parsea, se devuelve el contenido original.
function safeParseJson(content) {
  try {
    return JSON.parse(content);
  } catch {
    return content;
  }
}

// Convierte cualquier error desconocido en un mensaje seguro para responder a la UI.
function getErrorMessage(error) {
  return error instanceof Error ? error.message : 'Error al procesar el archivo.';
}

// Estructura unica para errores HTTP del backend.
function sendError(res, status, message) {
  return res.status(status).json({
    success: false,
    error: message,
  });
}

// Para Markdown intentamos el formato que puede conservar imagenes; JSON usa el formato base.
function getConvertFormat(mode) {
  return mode === 'markdown' ? 'markdown-with-images' : 'json';
}

// Opendataloader puede generar png/jpg; este helper prepara el mime para dataUri.
function getMimeTypeByExtension(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return extension === '.jpg' || extension === '.jpeg' ? 'image/jpeg' : 'image/png';
}

// Recorre la carpeta de salida y convierte imagenes generadas en assets base64.
async function collectImageAssets(outputDir) {
  const assets = [];

  async function readDirectory(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        // Las imagenes pueden generarse en subcarpetas, por eso se recorre recursivamente.
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

// Limpia y recrea la salida antes de reintentar una conversion sin imagenes.
async function resetOutputDirectory(outputDir, imageDir) {
  await fs.rm(outputDir, { recursive: true, force: true }).catch(() => {});
  await fs.mkdir(outputDir, { recursive: true });
  await fs.mkdir(imageDir, { recursive: true });
}

// Inserta dataUri en Markdown cuando el texto contiene referencias a las imagenes extraidas.
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

// Primer intento con imagenes; si falla, se reintenta sin imagenes para no perder el texto.
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
    console.warn('No se pudieron extraer imagenes. Reintentando sin imagenes:', getErrorMessage(error));

    await resetOutputDirectory(tempOutputDirPath, tempImageDirPath);

    await convert([tempFilePath], {
      outputDir: tempOutputDirPath,
      format: mode,
      imageOutput: 'off',
    });
  }
}

// Funcion central de conversion: la usan tanto el endpoint individual como el batch.
async function convertPdfBuffer(file, mode) {
  let tempFilePath = null;
  let tempOutputDirPath = null;

  try {
    // Nombre unico para que conversiones simultaneas no pisen temporales.
    const tempName = `pdf_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const extension = mode === 'json' ? '.json' : '.md';
    const tempImageDirName = `${tempName}_images`;

    tempFilePath = path.join(tmpdir(), `${tempName}.pdf`);
    tempOutputDirPath = path.join(tmpdir(), `${tempName}_out`);
    const tempImageDirPath = path.join(tempOutputDirPath, tempImageDirName);

    // La libreria trabaja con rutas de archivo, por eso el buffer de Multer se escribe en tmpdir().
    await fs.writeFile(tempFilePath, file.buffer);
    await fs.mkdir(tempOutputDirPath, { recursive: true });
    await fs.mkdir(tempImageDirPath, { recursive: true });

    if (isDevelopment) {
      console.log(`Operando en: ${tempFilePath}`);
      console.log(`Formato seleccionado: ${mode}`);
    }

    await convertWithImageFallback(tempFilePath, tempOutputDirPath, tempImageDirPath, mode);

    // Despues de convertir, buscamos el .json o .md generado por la libreria.
    const filesInOutput = await fs.readdir(tempOutputDirPath);
    if (isDevelopment) {
      console.log('Archivos generados en salida:', filesInOutput);
    }

    if (filesInOutput.length === 0) {
      throw new Error('La libreria no genero archivos. Revisa si el PDF tiene texto legible.');
    }

    const resultFile =
      filesInOutput.find((fileName) => fileName.toLowerCase().endsWith(extension)) ||
      filesInOutput[0];

    const originalBase = file.originalname ? path.parse(file.originalname).name : tempName;
    const finalContent = await fs.readFile(path.join(tempOutputDirPath, resultFile), 'utf-8');
    const assets = await collectImageAssets(tempOutputDirPath);
    // JSON devuelve content + assets; Markdown intenta quedar como texto autocontenido.
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
    // Limpieza obligatoria: no dejamos PDFs ni salidas temporales en disco.
    if (tempFilePath){
      await fs.unlink(tempFilePath).catch(() => {});
    } 
    if (tempOutputDirPath){
      await fs.rm(tempOutputDirPath, { recursive: true, force: true }).catch(() => {});
    } 
  }
}

// Conversion individual: siempre devuelve results con un solo item para mantener contrato uniforme.
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

// Conversion multiple/carpeta: procesa cada PDF y guarda success/error por archivo.
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
        // Se procesa uno por uno para controlar memoria y no perder todo si un PDF falla.
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
      error: hasSuccess ? undefined : 'No se pudo convertir ningun PDF.',
    });
  } catch (error) {
    console.error('Error detallado:', error);
    return sendError(res, 500, getErrorMessage(error));
  }
});

// Captura errores de Multer y validacion antes de que lleguen como HTML al frontend.
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
