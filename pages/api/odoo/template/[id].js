import axios from 'axios';

export default async function handler(req, res) {
  const { id } = req.query;

  try {
    const response = await axios.get(`https://course-project-jddk.vercel.app/api/forms/${id}`); 
    res.status(200).json(response.data);
  } catch (error) {
    console.error("Ошибка получения данных по ID:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
}
