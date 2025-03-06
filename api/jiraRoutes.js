const express = require("express");
const axios = require("axios");
const config = require("../config");

const jiraRouter = express.Router();

jiraRouter.post("/create-ticket", async (req, res) => {
  const { summary, priority, link, template, userEmail } = req.body;

  try {
    const jiraResponse = await axios.post(
      "https://olyakrug88.atlassian.net/rest/api/3/issue",
      {
        fields: {
          project: { key: "SCRUM" },
          summary: summary,  
          description: {
            type: "doc",
            version: 1,
            content: [
              {
                type: "paragraph",
                content: [
                  { type: "text", text: `Reported by: ${userEmail}` },
                  { type: "text", text: `\nTemplate: ${template}` },
                  { type: "text", text: `\nPage: ${link}` }
                ]
              }
            ]
          },
          issuetype: { name: "Task" },
          priority: { name: priority },
        },
      },
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            `olyakrug88@gmail.com:${config.jira.JIRA_API_TOKEN}`
          ).toString("base64")}`,
          "Content-Type": "application/json",
        },
      }
    );
  
    res.json({ jiraTicketUrl: `https://olyakrug88.atlassian.net/browse/${jiraResponse.data.key}` });
  } catch (error) {
    console.error("Jira API error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to create Jira ticket" });
  }
});


jiraRouter.get("/get-tickets", async (req, res) => {
  try {
    const jiraResponse = await axios.get(
      `https://olyakrug88.atlassian.net/rest/api/3/search?jql=project=SCRUM`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            `olyakrug88@gmail.com:${config.jira.JIRA_API_TOKEN}`
          ).toString("base64")}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.json(
      jiraResponse.data.issues.map((issue) => ({
        id: issue.id,
        key: issue.key,
        summary: issue.fields.summary,
        status: issue.fields.status.name,
        link: `https://olyakrug88.atlassian.net/browse/${issue.key}`,
      }))
    );
  } catch (error) {
    console.error("Jira API error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch tickets" });
  }
});

module.exports = jiraRouter;

