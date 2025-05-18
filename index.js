// backend/index.js
require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const mysql = require('mysql2');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();

const corsOptions = {
  origin: ['http://127.0.0.1:5500', 'http://localhost:5500', 'https://brandon-rgb-bit.github.io'],
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

app.use(express.json());
app.use(express.static('../frontend'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

function verifyToken(req, res, next) {
  const token = req.body.token || req.headers['authorization'];
  if (!token) return res.status(403).json({ error: 'Token requerido' });
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Token inválido' });
    req.user = decoded;
    next();
  });
}

function verifyAdmin(req, res, next) {
  if (req.user.email !== process.env.ADMIN_EMAIL) {
    return res.status(403).json({ error: 'Solo el administrador puede acceder' });
  }
  next();
}

app.post('/register', async (req, res) => {
  const { nombre, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  db.query(
    'INSERT INTO usuarios (nombre, email, contrasena_hash) VALUES (?, ?, ?)',
    [nombre, email, hashedPassword],
    (err) => {
      if (err) return res.status(500).json({ error: err });
      res.status(201).json({ message: 'Usuario registrado' });
    }
  );
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  db.query('SELECT * FROM usuarios WHERE email = ?', [email], async (err, results) => {
    if (err || results.length === 0) return res.status(401).json({ error: 'Usuario no encontrado' });
    const usuario = results[0];
    const match = await bcrypt.compare(password, usuario.contrasena_hash);
    if (!match) return res.status(401).json({ error: 'Contraseña incorrecta' });
    const token = jwt.sign({ id: usuario.id, email: usuario.email }, process.env.JWT_SECRET);
    res.json({ token });
  });
});

app.post('/inmuebles', upload.single('imagen'), (req, res) => {
  const { token, titulo, descripcion, tipo, precio, estado, municipio, mapa, contacto, disponible } = req.body;
  const imagen_url = req.file ? '/uploads/' + req.file.filename : '';

  if (!token) return res.status(401).json({ error: 'Token requerido' });
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Token inválido' });
    const usuario_id = decoded.id;
    db.query(
      'INSERT INTO inmuebles (usuario_id, titulo, descripcion, tipo, precio, estado, municipio, imagen_url, mapa, contacto, disponible) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [usuario_id, titulo, descripcion, tipo, precio, estado, municipio, imagen_url, mapa, contacto, disponible === '1' ? 1 : 0],
      (err) => {
        if (err) return res.status(500).json({ error: err });
        res.status(201).json({ message: 'Inmueble publicado' });
      }
    );
  });
});

app.get('/api/inmuebles', (req, res) => {
  const { estado, municipio } = req.query;
  let sql = 'SELECT * FROM inmuebles WHERE disponible = 1';
  const filtros = [];
  if (estado) filtros.push(`estado = ${db.escape(estado)}`);
  if (municipio) filtros.push(`municipio LIKE ${db.escape('%' + municipio + '%')}`);
  if (filtros.length) sql += ' AND ' + filtros.join(' AND ');
  sql += ' ORDER BY fecha_publicacion DESC';

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

app.get('/admin/usuarios', verifyToken, verifyAdmin, (req, res) => {
  db.query('SELECT id, nombre, email, fecha_registro FROM usuarios', (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

app.get('/admin/inmuebles', verifyToken, verifyAdmin, (req, res) => {
  db.query('SELECT * FROM inmuebles ORDER BY fecha_publicacion DESC', (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

app.delete('/admin/inmuebles/:id', verifyToken, verifyAdmin, (req, res) => {
  const id = req.params.id;
  db.query('DELETE FROM inmuebles WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: 'Inmueble eliminado' });
  });
});

app.listen(3000, () => {
  console.log('Servidor iniciado en puerto 3000');
});
