import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { convert } from '@opendataloader/pdf';
import fs from 'fs/promises';
import path from 'path';
import { tmpdir } from 'os';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

app.post('/api/transformfile', upload.single('file'), async (req, res) => {
  let tempFilePath = null;
  let tempOutputDirPath = null;

  try {
    const file = req.file;
    let mode = typeof req.body.mode === 'string' ? req.body.mode.toLowerCase() : 'markdown';
    if (mode === 'json') {
      mode = 'json';
    } else if (mode === 'markdown') {
      mode = 'markdown';
    } else {
      mode = 'markdown';
    }
    if (!file) return res.status(400).json({ error: "No hay archivo" });

    const tempName = `pdf_${Date.now()}`;
    tempFilePath = path.join(tmpdir(), `${tempName}.pdf`);
    tempOutputDirPath = path.join(tmpdir(), `${tempName}_out`);

    await fs.writeFile(tempFilePath, file.buffer);
    await fs.mkdir(tempOutputDirPath, { recursive: true });

    console.log(`Operando en: ${tempFilePath}`);
    console.log(`Formato seleccionado: ${mode}`);

    await convert([tempFilePath], {
      outputDir: tempOutputDirPath,
      format: mode,
    });

    const filesInOutput = await fs.readdir(tempOutputDirPath);
    console.log("Archivos generados en salida:", filesInOutput);

    // if (filesInOutput.length === 0) {
    //   throw new Error(`La librería no generó archivos. Revisa si el PDF tiene texto legible.`);
    // }

    const extension = mode === 'json' ? '.json' : '.md';
    const resultFile = filesInOutput.find(f => f.toLowerCase().endsWith(extension));
    if (!resultFile) {
      const fallbackFile = filesInOutput[0];
      const content = await fs.readFile(path.join(tempOutputDirPath, fallbackFile), 'utf-8');
      return res.json({ success: true, data: content });
    }

    const originalBase = file.originalname ? path.parse(file.originalname).name : `pdf_${Date.now()}`;
    const finalContent = await fs.readFile(path.join(tempOutputDirPath, resultFile), 'utf-8');
    let parsedData = finalContent;

    if (mode === 'json') {
      try {
        parsedData = JSON.parse(finalContent);
      } catch {
        parsedData = finalContent;
      }
    }

    const response = {
      success: true,
      fileName: `${originalBase}${extension}`,
      data: parsedData,
    };

    res.json(response);

  } catch (error) {
    console.error("❌ Error detallado:", error);
    res.status(500).json({ error: error.message });
  } finally {
    // Limpieza (Opcional: comenta estas líneas si quieres ver los archivos en la carpeta Temp)
    // if (tempFilePath) await fs.unlink(tempFilePath).catch(() => {});
    // if (tempOutputDirPath) await fs.rm(tempOutputDirPath, { recursive: true, force: true }).catch(() => {});
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor activo en http://localhost:${PORT}`);
});