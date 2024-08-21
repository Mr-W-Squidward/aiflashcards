import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const systemPrompt = `
You are given a list of topics. Based on these topics, generate subtopics and questions related to each item. Return a JSON object structured as follows: 
{
  "topics": [
    {
      "name": "<topic_name>",
      "questions": [
        "question_1",
        "question_2",
        ...
      ]
    }
  ]
}.
`;

export async function POST(req) {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: { responseMimeType: "application/json" },
    });

    const { curriculum } = await req.json();

    if (!curriculum || curriculum.length === 0) {
      return NextResponse.json(
        { success: false, message: "Invalid curriculum data." },
        { status: 400 }
      );
    }

    const curriculumText = curriculum.join("\n");
    const response = await model.generateContent({
      prompt: systemPrompt + curriculumText,
    });

    try {
      const generatedContent = JSON.parse(response.content);
    } catch (err) {
      console.error("Failed to parse AI-generated content:", err);
      return NextResponse.json(
        { success: false, message: "Failed to parse AI-generated content." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, topics: generatedContent.topics });
  } catch (error) {
    console.error("Error in /api/generateQuestions:", error);
    return NextResponse.json(
      { success: false, message: "An error occurred while processing the curriculum." },
      { status: 500 }
    );
  }
}