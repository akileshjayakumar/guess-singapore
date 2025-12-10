import { NextRequest, NextResponse } from "next/server";

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const MODEL = "sonar";

interface AIRequest {
  type: "hint" | "explain" | "funfact" | "reaction";
  word: string;
  category: string;
  hint?: string;
  guessNumber?: number;
  won?: boolean;
  userMessage?: string;
}

export async function POST(request: NextRequest) {
  if (!PERPLEXITY_API_KEY) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  try {
    const body: AIRequest = await request.json();
    const { type, word, category, hint, guessNumber, won, userMessage } = body;

    let systemPrompt = "";
    let userPrompt = "";

    switch (type) {
      case "hint":
        systemPrompt = `You are the Merlion, Singapore's friendly mascot. Help players guess a Singapore-related word. You can sprinkle in light Singlish phrases (like "lah" or "can") but keep it understandable for tourists. Give helpful but not too obvious hints. Never reveal the actual word. Keep responses under 40 words.`;
        userPrompt = userMessage 
          ? `The secret word is "${word}" (category: ${category}). Basic hint: "${hint}". Player asks: "${userMessage}". Give a helpful clue without revealing the word.`
          : `The secret word is "${word}" (category: ${category}). Give a creative hint that doesn't reveal the word directly.`;
        break;

      case "explain":
        systemPrompt = `You are a Singapore culture guide helping visitors learn. Provide clear, structured explanations with markdown formatting. Use this format:

**What it is:** (1 sentence definition)

**Origin:** (1-2 sentences on history/background)

**Where to find it:** (specific locations in Singapore)

Keep it concise and practical. Max 80 words total.`;
        userPrompt = `Explain "${word}" (category: ${category}). Context: "${hint}". Make it useful for tourists visiting Singapore.`;
        break;

      case "funfact":
        systemPrompt = `You are a Singapore expert sharing bite-sized facts. Use markdown formatting:

**Did you know?** (one surprising fact, 1-2 sentences)

**Pro tip:** (practical advice for visitors, 1 sentence)

Keep it under 50 words total. Focus on what tourists would find interesting or useful.`;
        userPrompt = `Share a fun fact about "${word}" in Singapore (category: ${category}). Context: "${hint}".`;
        break;

      case "reaction":
        systemPrompt = `You are a friendly companion. React briefly to game results. Use minimal Singlish (maximum one light expression like "lah"). Keep responses clear, short, and encouraging. Maximum 15 words.`;
        userPrompt = won
          ? `Player won! Guessed "${word}" in ${guessNumber} tries. Give a brief, warm celebration.`
          : `Player lost on "${word}". Give brief encouragement to try again.`;
        break;

      default:
        return NextResponse.json({ error: "Invalid request type" }, { status: 400 });
    }

    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Perplexity API error:", error);
      return NextResponse.json({ error: "AI service error" }, { status: 500 });
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || "Something went wrong!";

    return NextResponse.json({ response: aiResponse });
  } catch (error) {
    console.error("AI route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}