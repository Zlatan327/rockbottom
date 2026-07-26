// OpenRouter uses native fetch, no SDK needed

export async function processMessage(state, userMessage) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  let newState = state;
  let response = "";
  let milestonePreview = null;

  const msg = userMessage.toLowerCase();

  switch (state) {
    case 'GREETING':
      newState = 'GOAL_INPUT';
      response = "Sup anon. Ready to put your money where your mouth is? Tell me what you're trying to achieve. I'll read your goal and automatically deploy a token, ticker, and proof requirements for you.";
      break;

    case 'GOAL_INPUT':
      if (!apiKey) {
        response = "Error: OPENROUTER_API_KEY is not configured in the environment. Please add it to your .env file to enable the AI Agent.";
        break;
      }
      
      try {
        const prompt = `
          You are the RockBottom AI Agent. A user wants to create a "Meme Execution Market" around a personal goal.
          Their goal is: "${userMessage}"
          
          Based on their goal, generate a JSON object with the following properties:
          - "title": A catchy title for the milestone (string)
          - "description": A slightly edgy, hype description of the goal (string)
          - "proof_requirements": Rigorous requirements on how they must prove they achieved it to prevent cheating (string)
          - "token_name": A cool name for their meme token (string)
          - "token_ticker": A 3-6 letter ticker symbol starting with $ (string)
          - "total_supply": A logical token supply between 1,000,000 and 1,000,000,000 (number)
          
          Only return the raw JSON object. Do not include markdown blocks or any other text.
        `;
        
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" }
          })
        });
        
        if (!res.ok) {
           throw new Error(`OpenRouter error: ${res.statusText}`);
        }
        
        const data = await res.json();
        const rawContent = data.choices[0].message.content;
        
        // Strip out any potential markdown code blocks returned by the model
        const cleanedContent = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanedContent);
        
        newState = 'CONFIRMATION';
        response = `Alright, I've analyzed your goal. I'm minting ${parsed.token_ticker} with a supply of ${parsed.total_supply.toLocaleString()}. Review the config preview. Are you ready to deploy this on-chain?`;
        
        milestonePreview = {
          title: parsed.title,
          description: parsed.description,
          proof_requirements: parsed.proof_requirements,
          token_name: parsed.token_name,
          token_ticker: parsed.token_ticker,
          total_supply: parsed.total_supply,
          status: 'draft'
        };
      } catch (err) {
        console.error("AI Generation failed:", err);
        response = "My AI circuits fried trying to process that. Can you rephrase your goal?";
      }
      break;

    case 'CONFIRMATION':
      if (msg.includes('yes') || msg.includes('deploy') || msg.includes("let's go") || msg.includes('send') || msg.includes('ready')) {
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
