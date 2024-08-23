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

    let response = await model.generateContentStream(systemPrompt + curriculumText);

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const encoder = new TextEncoder();
          let content = "";

          for await (const chunk of response.stream) {
            const text = chunk.text();
            if (text) {
              content += text;
            }
          }

          // Parsing the content
          let generatedContent;
          try {
            generatedContent = JSON.parse(content);
          } catch (err) {
            console.error("Failed to parse AI-generated content:", err);
            return controller.close();
          }

          // Check if topics are generated correctly
          if (generatedContent.topics && generatedContent.topics.length > 0) {
            // Filter out any irrelevant topics/questions
            const validTopics = generatedContent.topics.filter(topic => topic.name && topic.questions && topic.questions.length > 0);

            if (validTopics.length === 0) {
              controller.enqueue(encoder.encode(JSON.stringify({
                success: false,
                message: "No valid topics or questions generated.",
              })));
            } else {
              const jsonResponse = JSON.stringify({
                success: true,
                topics: validTopics,
              });
              controller.enqueue(encoder.encode(jsonResponse));
            }
          } else {
            controller.enqueue(encoder.encode(JSON.stringify({
              success: false,
              message: "Unexpected response format from the AI model.",
            })));
          }
        } catch (err) {
          console.error("Error processing stream:", err);
        } finally {
          controller.close();
        }
      }
    });

    return new NextResponse(stream);
  } catch (error) {
    console.error("Error in /api/generateQuestions:", error);
    return NextResponse.json(
      { success: false, message: "An error occurred while processing the curriculum." },
      { status: 500 }
    );
  }
}