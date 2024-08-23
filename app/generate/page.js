"use client";

import { db } from "@/firebase";
import { useUser, SignOutButton } from "@clerk/nextjs";
import { collection, doc, getDoc, setDoc } from "firebase/firestore";
import { useState, useEffect } from "react";
import { IoIosClose } from "react-icons/io";
import { IconContext } from "react-icons";
import { PiSidebar } from "react-icons/pi";
import { IoCreateOutline } from "react-icons/io5";
import { AiOutlineLoading } from "react-icons/ai";
import UploadCurriculum from "@/app/curriculum/page";

export default function Generate() {
  const { isLoaded, user } = useUser();
  const [input, setInput] = useState("");
  const [page, setPage] = useState("create");
  const [sessions, setSessions] = useState([]);
  const [sideBar, setSideBar] = useState("16rem");
  const [loading, setLoading] = useState(false);
  const [showQA, setShowQA] = useState("Q");
  const [showQ, setShowQ] = useState("flex");
  const [showA, setShowA] = useState("none");
  const [showCurriculum, setShowCurriculum] = useState(false);
  const [showCreate, setShowCreate] = useState("flex");
  const [showOtherPages, setShowOtherPages] = useState("none");

  const [subject, setSubject] = useState("");
  const [card, setCard] = useState(["", ""]);
  const [cardLoading, setCardLoading] = useState("none");

  const buttonDisplayLoad = () => (loading ? "none" : "flex");
  const loaderDisplayLoad = () => (loading ? "flex" : "none");

  useEffect(() => {
    if (showQA === "Q") {
      setShowQ("flex");
      setShowA("none");
    } else {
      setShowQ("none");
      setShowA("flex");
    }
  }, [showQA]);

  useEffect(() => {
    if (page !== "create" && sessions.length > 0) {
      setSubject(sessions[page]);
    }
  }, [page, sessions]);

  const loadMaterial = async () => {
    if (isLoaded && user && subject) {
      setCardLoading("flex");
      const docRef = doc(collection(db, "flashcard"), user.id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        try {
          const subjectData = docSnap.data()[subject];
          if (!subjectData || !subjectData.topics) throw new Error("No valid topics found for this session.");

          const topics = Object.keys(subjectData.topics).filter((topic) => topic.trim() !== "");
          if (topics.length === 0) throw new Error("No valid topics available.");

          const selectedCategory = topics[Math.floor(Math.random() * topics.length)];

          const response = await fetch("/api/card", {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify({ subject: selectedCategory }),
          });

          if (!response.ok) throw new Error("Failed to fetch a question from the API.");

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let questionText = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            questionText += decoder.decode(value, { stream: true });
          }

          const parsedQuestion = JSON.parse(questionText);

          if (parsedQuestion.question && parsedQuestion.question.trim() !== "") {
            setCard([selectedCategory, parsedQuestion.question]);
          } else {
            throw new Error("Received an invalid question from the API.");
          }
        } catch (err) {
          console.error("Error loading material:", err.message);
        } finally {
          setCardLoading("none");
        }
      } else {
        console.error("Document does not exist or no subject selected.");
        setCardLoading("none");
      }
    }
  };

  useEffect(() => {
    if (subject) loadMaterial();
  }, [subject]);

  const updateSessions = async () => {
    if (isLoaded && user) {
      const docRef = doc(collection(db, "flashcard"), user.id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const storedSessions = docSnap.data();
        setSessions(Object.keys(storedSessions).sort());
      }
    }
  };

  useEffect(() => {
    updateSessions();
  }, [isLoaded]);

  const deleteSession = async (sessionName) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete the session "${sessionName}"?`);
    if (!confirmDelete) return;

    if (isLoaded && user) {
      const docRef = doc(collection(db, "flashcard"), user.id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        let sessionData = docSnap.data();

        delete sessionData[sessionName];

        await setDoc(docRef, sessionData);

        setSessions(Object.keys(sessionData).sort());

        if (page === sessionName) {
          setPage("create");
          setShowCreate("flex");
          setShowOtherPages("none");
        }
      }
    }
  };

  const renderPrevSessions = () => {
    let rows = [];
    for (let i = 0; i < sessions.length; i++) {
      rows.push(
        <div
          key={i}
          className="p-2 w-full bg-gray-200 hover:brightness-90 flex justify-between items-center cursor-pointer"
        >
          <p
            className="w-full text-left text-black"
            onClick={() => {
              setPage(i);
              setShowOtherPages("flex");
              setShowCreate("none");
            }}
          >
            {sessions[i]}
          </p>
          <button
            className="text-red-500 hover:text-red-700 ml-2 px-2 py-1 text-sm rounded border border-red-500 hover:border-red-700"
            onClick={() => deleteSession(sessions[i])}
          >
            Delete
          </button>
        </div>
      );
    }
    if (rows.length === 0) {
      return (
        <div key={-1} className="p-2 w-full bg-gray-200">
          <p className="w-full text-left text-black">No previous chats!</p>
        </div>
      );
    }
    return rows;
  };

  const toggleSidebar = () => {
    setSideBar(sideBar === "16rem" ? "0rem" : "16rem");
  };

  const showIcons = () => (sideBar === "16rem" ? "none" : "flex");
  const hideSidebar = () => (sideBar === "16rem" ? "flex" : "none");

  const newSessionFromCurriculum = async (curriculumData) => {
    if (!loading && user) {
      setLoading(true);
      const docRef = doc(collection(db, "flashcard"), user.id);
      const docSnap = await getDoc(docRef);

      let prevData = docSnap.exists() ? docSnap.data() : {};
      const date = new Date();

      let topics = {};
      if (Array.isArray(curriculumData) && curriculumData.length > 0) {
        curriculumData = curriculumData.filter((topic) => topic.trim() !== "");

        if (curriculumData.length === 0) {
          console.error("No valid topics provided.");
          setLoading(false);
          return;
        }

        curriculumData.forEach((topic) => {
          topics[topic] = { streak: 0 };
        });
      } else {
        console.error("Expected curriculumData to be an array. Received:", typeof curriculumData);
        setLoading(false);
        return;
      }

      prevData[input] = {
        date: {
          day: date.getDate(),
          month: date.getMonth() + 1,
          year: date.getFullYear(),
        },
        topics,
      };

      await setDoc(docRef, prevData);

      setSessions((prevSessions) => [...prevSessions, input]);
      setLoading(false);
      setSubject(input);
      setPage(sessions.length); // Switch to the newly created session
      setShowCreate("none");
      setShowOtherPages("flex");
    }
  };

  const newSession = async () => {
    if (!loading && user) {
      setLoading(true);
      if (user.id) {
        const docRef = doc(collection(db, "flashcard"), user.id);
        const docSnap = await getDoc(docRef);
        let prevData = {};
        if (docSnap.exists()) {
          prevData = docSnap.data();
        }
        const date = new Date();
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: {
            "Content-Type": "text/plain",
          },
          body: JSON.stringify(input),
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let returnedTopics = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          returnedTopics += decoder.decode(value, { stream: true });
        }
        returnedTopics = JSON.parse(returnedTopics)["subtopics"];

        const topics = {};
        for (let i = 0; i < returnedTopics.length; i++) {
          topics[returnedTopics[i]] = { streak: 0 };
        }

        prevData[input] = {
          date: {
            day: date.getDate(),
            month: date.getMonth() + 1,
            year: date.getFullYear(),
          },
          topics,
        };

        await setDoc(docRef, prevData);
        updateSessions();
        setInput("");
        setLoading(false);
        setSubject(input);
        setPage(sessions.length);
        setShowCreate("none");
        setShowOtherPages("flex");
      }
    }
  };

  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState(["", ""]);
  const onAnswer = async () => {
    setLoading(true);
    const response = await fetch("/api/check", {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
      },
      body: JSON.stringify(`
                Subject: ${subject}: ${card[0]}
                Question: ${card[1]}
                User answer: ${answer}
            `),
    });
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let verified = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      verified += decoder.decode(value, { stream: true });
    }
    verified = JSON.parse(verified);

    setFeedback([verified.correct ? "Correct" : "Incorrect", verified.improvement]);
    setShowQA("A");
    setLoading(false);
  };

  return (
    <div className="h-screen w-screen p-12 flex items-center justify-center">
      <div className="h-full w-full bg-[#ffffff88] rounded flex flex-row items-center justify-center overflow-hidden">
        <div
          style={{ width: sideBar }}
          className="bg-gray-200 h-full flex flex-col items-center justify-start transition-all"
        >
          <div className="p-4 flex flex-row w-full">
            <div className="grow flex items-center justify-start">
              <div
                style={{ display: hideSidebar() }}
                className="rounded p-2 bg-gray-200 hover:brightness-90"
              >
                <IconContext.Provider value={{ color: "black", size: "2rem" }}>
                  <PiSidebar className="cursor-pointer" onClick={toggleSidebar} />
                </IconContext.Provider>
              </div>
            </div>
            <div className="grow flex items-center justify-end">
              <div
                style={{ display: hideSidebar() }}
                className="rounded p-2 bg-gray-200 hover:brightness-90"
              >
                <IconContext.Provider value={{ color: "black", size: "2rem" }}>
                  <IoCreateOutline
                    className="cursor-pointer"
                    onClick={() => {
                      setShowCreate("flex");
                      setShowOtherPages("none");
                      setPage("create");
                    }}
                  />
                </IconContext.Provider>
              </div>
            </div>
          </div>
          <div className="w-full flex flex-col p-4 pt-2">
            <button
              onClick={() => setShowCurriculum(true)}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition duration-300"
            >
              Upload Curriculum
            </button>
          </div>
          <div className="w-full flex flex-col p-4 pt-2">{renderPrevSessions()}</div>
        </div>

        <div className="px-0 bg-white h-full grow flex flex-col">
          <div className="w-full p-4 border-b-2 h-20 flex flex-row items-center gap-4">
            <div style={{ display: showIcons() }} className="rounded p-2 bg-white hover:brightness-90">
              <IconContext.Provider value={{ color: "black", size: "2rem" }}>
                <PiSidebar className="cursor-pointer" onClick={toggleSidebar} />
              </IconContext.Provider>
            </div>
            <a href="/">
              <h2 className="text-black text-[1.5rem] h-8 hover:underline cursor-pointer">carta</h2>
            </a>
            <SignOutButton className="border-2 p-2" redirectUrl="/" />
            <div className="grow" />
            <div
              style={{ display: showIcons() }}
              className="cursor-pointer rounded p-2 bg-white hover:brightness-90"
              onClick={() => {
                setShowCreate("flex");
                setShowOtherPages("none");
                setPage("create");
              }}
            >
              <IconContext.Provider value={{ color: "black", size: "2rem" }}>
                <IoCreateOutline />
              </IconContext.Provider>
            </div>
          </div>

          <div className="w-full h-full flex flex-col p-12 overflow-x-hidden overflow-y-scroll">
            <div
              style={{ display: showCreate }}
              className="w-full h-full box-border bg-white flex items-center justify-center flex-col gap-4"
            >
              <h3 className="text-center text-black">New Chat</h3>
              <p className="text-black">Input your prompt:</p>
              <input
                className="text-black border-2 focus:outline-black p-2"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Study topic"
              ></input>
              <button
                style={{ display: buttonDisplayLoad() }}
                className="border-2"
                onClick={newSession}
              >
                Let's go!
              </button>
              <IconContext.Provider value={{ color: "black", size: "2rem" }}>
                <AiOutlineLoading
                  style={{ display: loaderDisplayLoad() }}
                  className="animate-spin"
                />
              </IconContext.Provider>
            </div>

            <div
              style={{ display: showOtherPages }}
              className="w-full h-full box-border bg-white flex items-center justify-center flex-col gap-4"
            >
              <div className="flex flex-col items-center justify-center gap-4">
                <IconContext.Provider value={{ color: "black", size: "2rem" }}>
                  <AiOutlineLoading style={{ display: cardLoading }} className="animate-spin" />
                </IconContext.Provider>
                <div className="flex flex-col items-center justify-center gap-4">
                  <h3 className="text-black w-full text-center">
                    {subject}: {card[0]}
                  </h3>
                  <div
                    style={{ display: showQ }}
                    className="p-4 border-2 flex flex-col gap-4 items-center justify-center rounded"
                  >
                    <div className="p-8 border-2 flex flex-col gap-4 items-center justify-center rounded">
                      <p className="text-black">{card[1]}</p>
                    </div>
                    <div className="flex flex-row gap-4 w-full">
                      <input
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        className="text-black border-2 focus:outline-black p-2 grow"
                        placeholder="Your answer"
                      ></input>
                      <button onClick={onAnswer} className="border-2">
                        Check
                      </button>
                    </div>
                  </div>

                  <div
                    style={{ display: showA }}
                    className="p-4 border-2 flex flex-col gap-4 items-center justify-center rounded"
                  >
                    <div className="p-8 border-2 flex flex-col gap-4 items-center justify-center rounded">
                      <p className="text-black">{feedback[0] + "!"}</p>
                      <p className="text-black">{feedback[1]}</p>
                      <button
                        onClick={() => {
                          loadMaterial();
                          setShowQA("Q");
                        }}
                        className="border-2"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showCurriculum && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg w-1/2 relative">
            <button
              onClick={() => setShowCurriculum(false)}
              className="absolute top-4 right-4 text-2xl"
            >
              <IoIosClose />
            </button>
            <UploadCurriculum
              onSubmit={(curriculumData) => {
                newSessionFromCurriculum(curriculumData);
                setShowCurriculum(false);
              }}
              onClose={() => setShowCurriculum(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}