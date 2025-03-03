const express = require("express");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");
const helmet = require("helmet");
const cors = require("cors");
const xmlrpc = require("xmlrpc");
const { PrismaClient } = require("@prisma/client");

dotenv.config();
const odooUrl = "https://course-project.odoo.com";
const db = "course-project";
const username = "your_user@example.com";
const password = "your_password";

const app = express();

const corsOptions = {
  origin: ["https://olgakruglik.github.io", "http://localhost:3000"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(helmet({ contentSecurityPolicy: false }));

const router = express.Router();
app.use("/api", router);
const prisma = new PrismaClient();



router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: "Все поля обязательны" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
      },
    });

    res.status(201).json({ message: "Пользователь создан!", userId: newUser.id });
  } catch (error) {
    console.error("Ошибка регистрации:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.get("/users", async (req, res) => {
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

    res.status(200).json({
      message: "User exists and password is valid.",
      userId: user.id, 
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


router.post("/forms", async (req, res) => {
  const { title, description, questions, userId } = req.body;

  if (!title || !description || !questions || !Array.isArray(questions) || !userId) {
    return res.status(400).json({ error: "Все поля обязательны" });
  }

  try {
    const newForm = await prisma.forms.create({
      data: {
        title,
        descriptions: description,
        user: { connect: { id: parseInt(userId, 10) } }, 
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

    res.status(201).json({ message: "Форма успешно создана!" });
  } catch (error) {
    console.error("Ошибка создания формы:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
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


router.get("/answers", async (req, res) => {
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

router.get("/odoo/forms", async (req, res) => {
  const common = xmlrpc.createClient({ url: `${odooUrl}/xmlrpc/2/common` });
  const object = xmlrpc.createClient({ url: `${odooUrl}/xmlrpc/2/object` });

  try {
    // Аутентификация
    common.methodCall("authenticate", [db, username, password, {}], (err, uid) => {
      if (err || !uid) {
        console.error("Ошибка аутентификации:", err);
        return res.status(500).json({ error: "Ошибка аутентификации Odoo" });
      }

      console.log("User ID:", uid);

      // Получение данных форм (survey.survey)
      object.methodCall(
        "execute_kw",
        [
          db,
          uid,
          password,
          "survey.survey",
          "search_read",
          [[["user_id", "=", uid]]], // Фильтр: только формы пользователя
          { fields: ["id", "title"] },
        ],
        (err, surveys) => {
          if (err) {
            console.error("Ошибка получения форм:", err);
            return res.status(500).json({ error: "Ошибка получения данных из Odoo" });
          }

          res.json({ forms: surveys });
        }
      );
    });
  } catch (error) {
    console.error("Ошибка Odoo API:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});




app.use((err, req, res, next) => {
  console.error("Ошибка:", err);
  res.status(500).json({ error: "Ошибка сервера", details: err.message });
});

app.options("*", cors(corsOptions));

module.exports = app;
