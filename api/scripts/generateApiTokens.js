const { PrismaClient } = require('@prisma/client');
const { randomBytes } = require('crypto');

const prisma = new PrismaClient();

async function generateApiTokens() {
  try {
    const users = await prisma.user.findMany({
      where: { apiToken: null },
    });

    for (const user of users) {
      const apiToken = randomBytes(32).toString('hex');
      await prisma.user.update({
        where: { id: user.id },
        data: { apiToken },
      });
      console.log(`API Token для пользователя ${user.email} был создан.`);
    }

    console.log("API токены успешно созданы для всех пользователей.");
  } catch (error) {
    console.error("Ошибка при обновлении API токенов:", error);
  } finally {
    await prisma.$disconnect();
  }
}

generateApiTokens();
