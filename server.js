const express = require("express");
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");

const app = express();
app.get("/", (req, res) => res.send("Bot running"));
app.listen(10000, () => console.log("Server OK"));

function chromiumPath() {
  return "/usr/bin/chromium";
}

function getDailyFile() {
  const d = new Date();
  const filename = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}.csv`;
  const dir = "./data";
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  const file = path.join(dir, filename);
  if (!fs.existsSync(file))
    fs.writeFileSync(file, "timestamp,multiplier\n");
  return file;
}

async function startBot() {
  console.log("Launching Chromium...");

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: chromiumPath(),
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();
  await page.goto("https://1xbet.com/en/games/crash", {
    waitUntil: "networkidle2"
  });

  console.log("Capture started...");

  page.on("response", async (resp) => {
    try {
      const url = resp.url();
      if (url.includes("games")) {
        const text = await resp.text().catch(() => null);
        if (!text) return;

        const m = text.match(/"F"\s*:\s*([\d.]+)/);
        if (m) {
          const value = parseFloat(m[1]);
          if (!isNaN(value)) {
            const ts = new Date().toISOString();
            fs.appendFileSync(getDailyFile(), `${ts},${value}\n`);
            console.log("Saved:", ts, value);
          }
        }
      }
    } catch (e) {}
  });
}

startBot();
