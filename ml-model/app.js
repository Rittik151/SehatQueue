const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5000;
const MODEL_PATH = path.join(__dirname, 'model.json');

app.use(cors());
app.use(express.json());

function loadModel() {
  if (!fs.existsSync(MODEL_PATH)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(MODEL_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

let model = loadModel();

function fallbackPredict(features) {
  const [queueLen, triage, hour, staff] = features;
  const estimate = 8 + queueLen * 1.8 + triage * 4 + hour * 0.9 - staff * 2.2;
  return Math.max(1, estimate);
}

function predict(features) {
  if (!model || !Array.isArray(model.weights) || model.weights.length !== features.length) {
    return fallbackPredict(features);
  }

  const value = features.reduce(
    (sum, current, index) => sum + current * model.weights[index],
    model.bias || 0
  );

  return Math.max(1, value);
}

app.post('/predict', (req, res) => {
  const features = req.body && req.body.features;

  if (!Array.isArray(features) || features.length !== 4) {
    return res.status(400).json({ error: 'features must be an array of 4 numbers' });
  }

  const numericFeatures = features.map(Number);
  if (numericFeatures.some(Number.isNaN)) {
    return res.status(400).json({ error: 'features must contain valid numbers' });
  }

  const prediction = predict(numericFeatures);
  return res.json({ prediction: Number(prediction.toFixed(2)) });
});

app.post('/reload-model', (_req, res) => {
  model = loadModel();
  return res.json({ ok: true, loaded: Boolean(model) });
});

app.listen(PORT, () => {
  console.log(`ML service running on port ${PORT}`);
});
