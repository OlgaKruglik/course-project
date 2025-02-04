const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const helmet = require('helmet');
const cors = require('cors');

dotenv.config();

const app = express();
        
        
const router = express.Router();
app.use('/api', router);

app.use(cors({
    origin: [
        'http://localhost:3000/api/users',
        'https://course-project-pearl-seven.vercel.app',
        'https://course-project-cmi5ck1cp-olgakrugliks-projects.vercel.app',
        'https://olgakruglik.github.io',
        'https://userslist-phi.vercel.app'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    next();
  });

// Middleware
app.use(express.json());
app.use(helmet({ contentSecurityPolicy: false }));

// Подключение к базе данных
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : null,
});
db.getConnection()
    .then(() => console.log('✅ Подключение к базе данных установлено'))
    .catch(err => {
        console.error('❌ Ошибка подключения к БД:', err);
        process.exit(1); // Завершает процесс, если БД недоступна
    });

app.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Все поля обязательны' });
        }

        // Хэшируем пароль
        const hashedPassword = await bcrypt.hash(password, 10);

        // Вставляем пользователя в базу
        const [result] = await db.execute(
            `INSERT INTO users (username, email, password) VALUES (?, ?, ?)`,
            [username, email, hashedPassword]
        );

        res.status(201).json({ message: 'Пользователь создан!', userId: result.insertId });
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получение списка пользователей
router.get('/users', async (req, res) => {
    const sql = 'SELECT id, username, email, created_at, is_locked, is_deleted FROM users';
    try {
        const [results] = await db.query(sql);
        res.json(results);
    } catch (err) {
        console.error('Ошибка при получении пользователей:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.options('*', cors());

// Обработчик 404
app.use((err, req, res, next) => {
    console.error('Ошибка:', err);
    res.status(500).json({ error: 'Ошибка сервера', details: err.message });
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
});

module.exports = app;


