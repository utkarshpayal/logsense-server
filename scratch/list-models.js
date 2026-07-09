const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config({ path: "/home/fiftyfive/Videos/logsense-server/.env" });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
  console.log("Listing models...");
  try {
    const models = await fetch("https://generativelanguage.googleapis.com/v1beta/models?key=" + process.env.GEMINI_API_KEY)
        .then(res => res.json());
    
    console.log(JSON.stringify(models, null, 2));
  } catch(e) {
    console.error(e);
  }
}

listModels();
