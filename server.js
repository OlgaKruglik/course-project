const express = require('express');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const cors = require('cors');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;


app.use(cors({
    origin: [
        'https://course-project-cmi5ck1cp-olgakrugliks-projects.vercel.app',
        'https://olgakruglik.github.io',
        'https://userslist-phi.vercel.app'
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
}));

// Middleware
app.use(express.json()); // Позволяет работать с JSON

// Подключение к базе данных
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : null,
});

// Регистрация пользователя (внесение данных в БД)
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

app.get('/users', async (req, res) => {
    const sql = 'SELECT id, username, email, password, is_locked FROM users'; // скрываем пароли
    try {
        console.log('SQL запрос:', sql); // Логирование SQL запроса
        const [results] = await db.query(sql);
        console.log('Полученные пользователи:', results); // Логирование результатов
        res.json(results);
    } catch (err) {
        console.error('Ошибка при получении пользователей:', err);
        res.status(500).json({ error: 'Ошибка при получении пользователей' });
    }
});

app.options('*', cors());



app.use((req, res) => {
    res.status(404).json({ error: 'Маршрут не найден' });
  });

module.exports = app;
