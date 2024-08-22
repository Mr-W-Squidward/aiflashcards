"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { collection, doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { AiOutlineLoading } from "react-icons/ai";

export default function UploadCurriculum({ onSubmit, onClose }) {
  const { isLoaded, user } = useUser();
  const [fileContent, setFileContent] = useState("");
  const [manualInput, setManualInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFileContent(e.target.result);
        setFeedback(`File uploaded: ${file.name}`);
      };
      reader.readAsText(file);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    const curriculumData = manualInput || fileContent;

    if (curriculumData.trim() && isLoaded && user) {
      try {
        const parsedData = curriculumData.split("\n").filter(line => line.trim());
        if (parsedData.length > 0) {
          const response = await fetch("/api/generateQuestions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ curriculum: parsedData }),
          });

          const generatedQuestions = await response.json();

          if (generatedQuestions.success) {
            const sessionName = `Session: ${parsedData[0].slice(0, 20)}`;
            const docRef = doc(collection(db, "flashcard"), user.id);
            const docSnap = await getDoc(docRef);

            let prevData = docSnap.exists() ? docSnap.data() : {};
            prevData[sessionName] = {
              date: {
                day: new Date().getDate(),
                month: new Date().getMonth() + 1,
                year: new Date().getFullYear(),
              },
              topics: generatedQuestions.topics,
            };

            await setDoc(docRef, prevData);

            setFeedback("Curriculum uploaded and session created successfully!");
            if (onSubmit) {
              onSubmit(sessionName);
            }
            onClose();
          } else {
            setFeedback("Failed to generate questions from the curriculum.");
          }
        } else {
          setFeedback("Uploaded curriculum is empty. Please provide valid content.");
        }
      } catch (error) {
        setFeedback("An error occurred during submission.");
      }
    } else {
      setFeedback("Please provide curriculum data before submitting.");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-lg relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-2xl text-gray-600 hover:text-gray-800"
        >
          &times;
        </button>
        <h1 className="text-2xl font-bold mb-6 text-center text-black">Upload Your Curriculum</h1>
        <div className="mb-6">
          <input
            type="file"
            accept=".txt"
            onChange={handleFileUpload}
            className="mb-4 w-full text-black"
          />
          <textarea
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="Or manually write your curriculum here..."
            className="border-2 border-gray-300 p-4 w-full h-40 rounded text-black"
          />
        </div>
        <button
          onClick={handleSubmit}
          className="bg-blue-500 text-white w-full px-6 py-2 rounded hover:bg-blue-600 transition duration-300"
        >
          Submit Curriculum
        </button>
        {loading && (
          <div className="flex justify-center mt-4">
            <AiOutlineLoading className="animate-spin text-2xl text-blue-500" />
          </div>
        )}
        {feedback && <p className="mt-4 text-center text-green-600">{feedback}</p>}
      </div>
    </div>
  );
}