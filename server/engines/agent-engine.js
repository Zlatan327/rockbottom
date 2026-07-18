export function processMessage(state, userMessage) {
  let newState = state;
  let response = "";
  let milestonePreview = null;

  const msg = userMessage.toLowerCase();

  switch (state) {
    case 'GREETING':
      newState = 'GOAL_INPUT';
      response = "Sup anon. Ready to put your money where your mouth is? What impossible goal are we grinding for today? Give me the deets.";
      break;

    case 'GOAL_INPUT':
      newState = 'REFINING';
      response = "I hear you. But that's too vague, we need hard numbers if people are gonna bet on this. Give me a metric and a deadline. e.g. '100 pushups by Friday 5pm'.";
      break;

    case 'REFINING':
      newState = 'PROOF_REQUIREMENTS';
      response = "Solid. Now, how are you gonna prove it? Pics or it didn't happen. Strava link? Video? Don't make it easy to fake.";
      break;

    case 'PROOF_REQUIREMENTS':
      newState = 'TOKEN_CONFIG';
      response = "Alright, let's tokenize this grind. I'm thinking a supply of 1,000,000. Give me a ticker name. Something catchy like $GRIND30 or $SENDIT.";
      break;

    case 'TOKEN_CONFIG':
      newState = 'CONFIRMATION';
      const ticker = msg.startsWith('$') ? msg : `$\${msg.toUpperCase()}`;
      response = `Perfect. \${ticker} is born. Look over the preview. You ready to lock this in and deploy? Once it's live, there's no backing out without taking a rep hit.`;
      milestonePreview = {
        title: "User's Grind Milestone",
        description: "Achieve the goal before the deadline.",
        proof_requirements: "User provided proof reqs",
        token_name: "Grind Token",
        token_ticker: ticker,
        total_supply: 1000000,
        status: 'draft'
      };
      break;

    case 'CONFIRMATION':
      if (msg.includes('yes') || msg.includes('deploy') || msg.includes('let\'s go') || msg.includes('send')) {
        newState = 'LAUNCHED';
        response = "LFG! 🚀 Milestone deployed. Contracts are live. Share this with your friends (or enemies) and let the betting begin. Don't fail, or your execution score goes straight to the shadow realm.";
      } else {
        response = "Cold feet? Fine. Let me know when you're actually ready to commit.";
      }
      break;

    case 'LAUNCHED':
      response = "Your milestone is already live, go shill it! Or do you want to start a new one?";
      newState = 'GREETING';
      break;

    default:
      newState = 'GREETING';
      response = "Yo, I lost my train of thought. What are we doing again?";
      break;
  }

  return { newState, response, milestonePreview };
}
