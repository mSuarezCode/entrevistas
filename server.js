const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const multer = require('multer'); // Para recibir el archivo Excel desde el frontend
const XLSX = require('xlsx');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public')); // Sirve tu archivo HTML

const upload = multer({ dest: 'uploads/' });

// Configura tu transporte SMTP (Ejemplo con Gmail o tu propio servidor)
const transporter = nodemailer.createTransport({
    host: 'smtp.tuservidor.com', // Ej: smtp.gmail.com
    port: 587,
    secure: false, 
    auth: {
        user: 'tu_correo@dominio.com',
        pass: 'tu_contraseña_o_app_password' // Si usas Gmail, genera una "Contraseña de aplicación"
    }
});

// Endpoint que recibe el Excel y dispara los correos
app.post('/api/enviar-masivo', upload.single('archivoExcel'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se subió ningún archivo.' });
        }

        // Leer el Excel cargado
        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const resultados = [];

        for (const [index, row] of data.entries()) {
            const destinatario = row['Correo']; // Ajusta al nombre exacto de tu columna
            const nombre = row['Nombre'] || 'Estimado(a)';

            if (!destinatario) {
                resultados.append?.({ fila: index + 1, estado: 'Omitido (Sin correo)' });
                continue;
            }

            try {
                await transporter.sendMail({
                    from: '"Tu Empresa" <tu_correo@dominio.com>',
                    to: destinatario,
                    subject: 'Aviso importante',
                    html: `<p>Hola <b>${nombre}</b>, este es tu correo automatizado.</p>`
                });
                resultados.push({ fila: index + 1, correo: destinatario, estado: 'Enviado' });
            } catch (err) {
                resultados.push({ fila: index + 1, correo: destinatario, estado: `Error: ${err.message}` });
            }

            // Pausa de 1 segundo para evitar saturar el servidor SMTP
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        res.json({ mensaje: 'Proceso completado', resultados });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000, () => {
    console.log('Servidor corriendo en http://localhost:3000');
});