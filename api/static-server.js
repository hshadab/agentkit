const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.UI_PORT ? parseInt(process.env.UI_PORT, 10) : 8000;

app.use(cors());
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

app.use(express.static('static'));

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`UI static server running at http://localhost:${PORT}/index-clean2.html`);
});

