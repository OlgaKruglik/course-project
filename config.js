require("dotenv").config();

const config = {
  db: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: process.env.DB_SSL === "REQUIRED" ? { rejectUnauthorized: true } : false,
  },
  odoo: {
    url: process.env.ODOO_URL,
    db: process.env.ODOO_DB,
    username: process.env.ODOO_USERNAME,
    password: process.env.ODOO_PASSWORD,
    apiKey: process.env.ODOO_API_KEY,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
  },
  jira: {
    JIRA_API_TOKEN: process.env.JIRA_API_TOKEN,
  }
};

module.exports = config; 
