const fs = require('fs');
const path = require('path');

const MODEL_PATH = path.join(__dirname, 'model.json');

function generateDataset(size = 300) {
  const rows = [];
  for (let i = 0; i < size; i += 1) {
    const queueLen = Math.floor(Math.random() * 50) + 1;
    const triage = Math.floor(Math.random() * 5) + 1;
    const hour = Math.floor(Math.random() * 12) + 8;
    const staff = Math.floor(Math.random() * 9) + 1;

    const baseline = 8;
    const noise = Math.random() * 10 - 5;
    const waitTime = Math.max(
      1,
      baseline + queueLen * 1.8 + triage * 4 + hour * 0.9 - staff * 2.2 + noise
    );

    rows.push({
      x: [queueLen, triage, hour, staff],
      y: waitTime
    });
  }
  return rows;
}

function trainLinearRegression(dataset, learningRate = 0.0002, epochs = 20000) {
  const featureCount = dataset[0].x.length;
  const weights = new Array(featureCount).fill(0);
  let bias = 0;

  for (let epoch = 0; epoch < epochs; epoch += 1) {
    const gradW = new Array(featureCount).fill(0);
    let gradB = 0;

    for (const row of dataset) {
      const prediction = row.x.reduce((sum, value, idx) => sum + value * weights[idx], bias);
      const error = prediction - row.y;

      for (let j = 0; j < featureCount; j += 1) {
        gradW[j] += error * row.x[j];
      }
      gradB += error;
    }

    const n = dataset.length;
    for (let j = 0; j < featureCount; j += 1) {
      weights[j] -= (learningRate * 2 * gradW[j]) / n;
    }
    bias -= (learningRate * 2 * gradB) / n;
  }

  return { weights, bias };
}

function main() {
  const dataset = generateDataset();
  const model = trainLinearRegression(dataset);

  fs.writeFileSync(MODEL_PATH, JSON.stringify(model, null, 2), 'utf-8');
  console.log('Model trained and saved as model.json');
}

main();
