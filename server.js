const express = require("express");
const path = require("path");
const app = express();
const PORT = 3000;

app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  متجر أبو السعود يعمل بنجاح!`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`  - رقم الواتساب: 01093178434`);
  console.log(`  - كلمة سر الأدمن: mustafa321123`);
  console.log(`========================================\n`);
});

