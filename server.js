const express = require("express");
const fs = require("fs");
const puppeteer = require("puppeteer");
const path = require("path");

const app = express();

app.get("/", (req, res) => {
  res.send("Bot is running");
});

app.listen(10000, () => {
  console.log("Webserver running on port 10000");
});

function getDailyFile() {
  const d = new Date();
  const filename = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}.csv`;
  const dir = "./data";
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  const file = path.join(dir, filename);
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, "timestamp,multiplier\n");
  }
  return file;
}

async function startBot() {
  console.log("Starting Puppeteer...");

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();
  await page.goto("https://1xbet.com/en/games/crash", { waitUntil: "networkidle2" });

  console.log("Bot is capturing multipliers...");

  page.on("response", async (response) => {
    try {
      const url = response.url();
      if (url.includes("games") || url.includes("ws") || url.includes("history")) {
        const text = await response.text().catch(() => null);
        if (!text) return;

        const m = text.match(/"F"\s*:\s*([\d.]+)/);
        if (m) {
          const val = parseFloat(m[1]);
          if (!isNaN(val)) {
            const ts = new Date().toISOString();
            fs.appendFileSync(getDailyFile(), `${ts},${val}\n`);
            console.log("Saved:", ts, val);
          }
        }
      }
    } catch (e) {}
  });
}

startBot();
