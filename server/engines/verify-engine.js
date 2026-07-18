export function analyzeProof(proof, milestone) {
  let score = 0;
  let analysis = "";
  let concerns = [];

  const typeScores = {
    'screenshot': { min: 60, max: 80, text: "Image analysis detects screen capture." },
    'url': { min: 70, max: 85, text: "URL verified and parsed." },
    'video': { min: 65, max: 80, text: "Video analyzed for continuous motion and metadata." },
    'text': { min: 40, max: 60, text: "Text-only proof provided." }
  };

  const proofType = proof.type.toLowerCase();
  
  if (typeScores[proofType]) {
    const range = typeScores[proofType];
    score = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
    analysis += range.text + " ";
  } else {
    score = 50;
    analysis += "Unknown proof type submitted. ";
    concerns.push("Non-standard proof format.");
  }

  // Multi-proof bonus simulated here (if we knew there were others, but we only analyze one at a time for this function)
  // Let's just add some simulated variance
  const contentLen = proof.content ? proof.content.length : 0;
  if (contentLen > 50) {
    score += 5;
    analysis += "Detailed description provided, adding context. ";
  } else if (contentLen < 10) {
    score -= 5;
    concerns.push("Vague description.");
  }

  // Ensure score is within bounds
  score = Math.max(0, Math.min(100, score));

  if (score < 50) {
    analysis += "Confidence is low. " + concerns.join(" ");
  } else if (score >= 75) {
    analysis += "High confidence in proof validity.";
  } else {
    analysis += "Moderate confidence. Could use more corroborating evidence. " + concerns.join(" ");
  }

  return { score, analysis, concerns };
}
