const express = require("express");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");
const helmet = require("helmet");
const cors = require("cors");
const xmlrpc = require("xmlrpc");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const { randomBytes } = require("crypto");
const config = require("../config");
const jiraRoutes = require("./jiraRoutes.js");



dotenv.config();


const app = express();

const corsOptions = {
  origin: ["https://olgakruglik.github.io", "http://localhost:3000", " https://form6.odoo.com/web/dataset/call_kw", "https://olgakruglik.github.io/react-course-project/"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
// app.use(helmet({ contentSecurityPolicy: false }));


const router = express.Router();
app.use("/api", router);
app.use("/api/jira", jiraRoutes);
const prisma = new PrismaClient();


const common = xmlrpc.createClient({ url: `${config.odoo.url}/xmlrpc/2/common` });
const object = xmlrpc.createClient({ url: `${config.odoo.url}/xmlrpc/2/object` });

common.methodCall("authenticate", [config.odoo.db, config.odoo.username, config.odoo.ODOO_API_KEY, {}], (err, uid) => {
  if (err || !uid) {
    return console.error("Ошибка аутентификации:", err);
  }

  console.log("Odoo User ID:", uid);

  // Получение списка форм
  object.methodCall(
    "execute_kw",
    [
      config.odoo.db,
      uid,
      config.odoo.password,
      "survey.survey",
      "search_read",
      [[], { fields: ["id", "title"] }],
    ],
    (err, surveys) => {
      if (err) {
        return console.error("Ошибка запроса форм:", err);
      }
      console.log("Список форм из Odoo:", surveys);
    }
  );
});





async function updateUsers() {
  const users = await prisma.user.findMany({
    where: { apiToken: null }, 
  });

  for (const user of users) {
    const newToken = randomBytes(32).toString("hex");

    await prisma.user.update({
      where: { id: user.id },
      data: { apiToken: newToken },
    });

    console.log(`Updated user ${user.email} with new API token.`);
  }

  console.log("All users updated!");
  await prisma.$disconnect();
}

updateUsers().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});

const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Требуется API токен" });
  }

  const user = await prisma.user.findFirst({ where: { apiToken: token } });
  if (!user) {
    return res.status(403).json({ error: "Недействительный API токен" });
  }
  req.user = user;
  next();
};


router.post("/register", authenticate, async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: "Все поля обязательны" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const apiToken = randomBytes(32).toString("hex");
    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        apiToken,
      },
    });

    res.status(201).json({ message: "Пользователь создан!", userId: newUser.id, apiToken  });
  } catch (error) {
    console.error("Ошибка регистрации:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.get("/users",  async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
      },
    });
    res.json(users);
  } catch (error) {
    console.error("Ошибка получения пользователей:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/check-user", async (req, res) => {
  const { email, password } = req.body;
  console.log("Received request:", email, password);

  if (!email || !password) {
    return res.status(400).json("Email and password are required.");
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json("User not found.");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json("Invalid email or password.");
    }

    let apiToken = user.apiToken;
    if (!apiToken) {
      apiToken = randomBytes(32).toString("hex");

      await prisma.user.update({
        where: { id: user.id },
        data: { apiToken },
      });
    }

    res.status(200).json({
      message: "User exists and password is valid.",
      userId: user.id, 
      apiToken: apiToken,
    });
  } catch (error) {
    console.error("Ошибка проверки пользователя:", error);
    res.status(500).json("Ошибка сервера.");
  }
});


router.delete("/delete-user/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const deletedUser = await prisma.user.delete({
      where: { id: parseInt(id) },
    });

    res.status(200).json({ message: "Пользователь удален!", userId: deletedUser.id });
  } catch (error) {
    console.error("Ошибка удаления пользователя:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});



const axios = require("axios");

router.post("/forms", async (req, res) => {
  const { title, description, questions } = req.body;

  if (!title || !description || !questions || !Array.isArray(questions)) {
    return res.status(400).json({ error: "Все поля обязательны" });
  }

  try {
    // Создание формы в локальной базе
    const newForm = await prisma.forms.create({
      data: {
        title,
        descriptions: description,
        user: { connect: { id: req.user.id } }, 
        questions: {
          create: questions.map((q) => ({
            title: q.title,
            type: q.type,
            descriptions: q.description || "",
            visible: 1,
          })),
        },
      },
    });

    // Отправка формы в Odoo
    const odooResponse = await axios.post(
      "https://form6.odoo.com/web/dataset/call_kw",
      {
      jsonrpc: "2.0",
    method: "call",
    params: {
      model: "survey.survey",
      method: "create",
      args: [{
        title: newForm.title,
        description: newForm.descriptions,
        // Пример добавления вопросов, если требуется
        questions: newForm.questions.map(q => ({
          title: q.title,
          description: q.descriptions,
          type: q.type,
          visible: q.visible,
        })),
      }],
      kwargs: {},
    },
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${process.env.ODOO_API_KEY}`,
        },
      }
    );

    res.status(201).json({
      message: "Форма успешно создана!",
      form: newForm,
      odooResponse: odooResponse.data,
    });
  } catch (error) {
    console.error("Ошибка при создании формы:", error);
    res.status(500).json({ error: "Ошибка при создании формы" });
  }
});



router.get("/profile/token", authenticate, async (req, res) => {
  res.json({ apiToken: req.user.apiToken });
});





router.get("/forms", async (req, res) => {
  try {
    const forms = await prisma.forms.findMany({
      select: {
        id: true,
        userId: true,
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        title: true,
        descriptions: true,
        questions: {
          select: {
            id: true,
            title: true,
            type: true,
            descriptions: true,
            visible: true,
          },
        },
      },
    });
    res.json(forms);
  } catch (error) {
    console.error("Ошибка получения форм:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/answers", async (req, res) => {
  const { userId, formId, answers } = req.body;

  if (!userId || !formId || !answers || !Array.isArray(answers)) {
    return res.status(400).json({ error: "Все поля обязательны" });
  }

  try {
    const createdAnswers = [];
    for (const { questionId, answer } of answers) {
      if (!questionId || answer === undefined) {
        return res.status(400).json({ error: "Вопрос и ответ обязательны" });
      }

      const newAnswer = await prisma.answers.create({
        data: {
          user: { connect: { id: parseInt(userId, 10) } },
          form: { connect: { id: parseInt(formId, 10) } },
          question: { connect: { id: parseInt(questionId, 10) } },
          answer,
        },
      });

      createdAnswers.push(newAnswer);
    }

    res.status(201).json({ message: "Ответы успешно созданы!", answers: createdAnswers });
  } catch (error) {
    console.error("Ошибка создания ответа:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});


router.get("/answers",async (req, res) => {
  const { formId } = req.query;

  if (!formId) {
    return res.status(400).json({ error: "formId обязателен" });
  }

  try {
    const answers = await prisma.answers.findMany({
      where: {
        formId: parseInt(formId, 10),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
        question: {
          select: {
            id: true,
            title: true,
            descriptions: true,
            type: true,
          },
        },
      },
    });

    res.json(answers);
  } catch (error) {
    console.error("Ошибка получения ответов:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

app.use((err, req, res, next) => {
  console.error("Ошибка:", err);
  res.status(500).json({ error: "Ошибка сервера", details: err.message });
});

app.options("*", cors(corsOptions));

module.exports = app;
