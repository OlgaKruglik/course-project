import axios from 'axios';

export default async function handler(req, res) {
  try {
    const response = await axios.get('https://course-project-jddk.vercel.app/api/forms'); 
    res.status(200).json(response.data);
  } catch (error) {
    console.error("Ошибка получения данных из Odoo:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
}
