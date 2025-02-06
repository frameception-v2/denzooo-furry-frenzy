"use client";

import { useEffect, useCallback, useState } from "react";
import sdk, {
  AddFrame,
  SignIn as SignInCore,
  type Context,
} from "@farcaster/frame-sdk";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "~/components/ui/card";

import { config } from "~/components/providers/WagmiProvider";
import { truncateAddress } from "~/lib/truncateAddress";
import { base, optimism } from "wagmi/chains";
import { useSession } from "next-auth/react";
import { createStore } from "mipd";
import { Label } from "~/components/ui/label";
import { PROJECT_TITLE } from "~/lib/constants";

const QUESTIONS = [
  {
    question: "What's your ideal snack?",
    answers: [
      "🥕 Crunchy veggies",
      "🍯 Sweet honey",
      "🌰 Nutty treats",
      "🍓 Fresh berries"
    ],
    correct: 2
  },
  {
    question: "Favorite way to nap?",
    answers: [
      "🛌 Curled in a ball",
      "🌳 On a tree branch",
      "🛋️ Stretched out sunny spot", 
      "💤 Anywhere, anytime"
    ],
    correct: 0
  },
  {
    question: "Choose a superpower:",
    answers: [
      "🐇 Super speed",
      "🦉 Night vision",
      "🦔 Spiky defense",
      "🐾 Silent paws"
    ],
    correct: 3
  }
];

const RESULTS = [
  { animal: "🐇 Bunny Buddy", desc: "Quick and curious!" },
  { animal: "🐻❄️ Polar Pal", desc: "Strong but cuddly" },
  { animal: "🦊 Foxy Friend", desc: "Sly but sweet" },
  { animal: "🐨 Koala Companion", desc: "Chill and relaxed" }
];

function QuizCard() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);

  const handleAnswer = (selectedIndex: number) => {
    if (selectedIndex === QUESTIONS[currentQuestion].correct) {
      setScore(score + 1);
    }

    if (currentQuestion < QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setShowResult(true);
    }
  };

  const resultIndex = Math.floor((score / QUESTIONS.length) * RESULTS.length);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{showResult ? RESULTS[resultIndex].animal : `Question ${currentQuestion + 1}`}</CardTitle>
        <CardDescription>
          {showResult ? RESULTS[resultIndex].desc : QUESTIONS[currentQuestion].question}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2">
        {showResult ? (
          <div className="text-center">
            <p className="text-xl mb-4">You scored {score}/{QUESTIONS.length}</p>
            <button 
              onClick={() => {
                setCurrentQuestion(0);
                setScore(0);
                setShowResult(false);
              }}
              className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
            >
              Try again
            </button>
          </div>
        ) : (
          QUESTIONS[currentQuestion].answers.map((answer, index) => (
            <button
              key={index}
              onClick={() => handleAnswer(index)}
              className="p-2 border rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {answer}
            </button>
          ))
        )}
        <div className="col-span-2 mt-4">
          <div className="h-2 bg-gray-200 rounded">
            <div 
              className="h-2 bg-purple-500 rounded transition-all"
              style={{ width: `${((currentQuestion + 1) / QUESTIONS.length) * 100}%` }}
            />
          </div>
          <div className="text-sm text-gray-500 mt-1">
            Progress: {currentQuestion + 1}/{QUESTIONS.length}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Frame() {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [context, setContext] = useState<Context.FrameContext>();

  const [added, setAdded] = useState(false);

  const [addFrameResult, setAddFrameResult] = useState("");

  const addFrame = useCallback(async () => {
    try {
      await sdk.actions.addFrame();
    } catch (error) {
      if (error instanceof AddFrame.RejectedByUser) {
        setAddFrameResult(`Not added: ${error.message}`);
      }

      if (error instanceof AddFrame.InvalidDomainManifest) {
        setAddFrameResult(`Not added: ${error.message}`);
      }

      setAddFrameResult(`Error: ${error}`);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      const context = await sdk.context;
      if (!context) {
        return;
      }

      setContext(context);
      setAdded(context.client.added);

      // If frame isn't already added, prompt user to add it
      if (!context.client.added) {
        addFrame();
      }

      sdk.on("frameAdded", ({ notificationDetails }) => {
        setAdded(true);
      });

      sdk.on("frameAddRejected", ({ reason }) => {
        console.log("frameAddRejected", reason);
      });

      sdk.on("frameRemoved", () => {
        console.log("frameRemoved");
        setAdded(false);
      });

      sdk.on("notificationsEnabled", ({ notificationDetails }) => {
        console.log("notificationsEnabled", notificationDetails);
      });
      sdk.on("notificationsDisabled", () => {
        console.log("notificationsDisabled");
      });

      sdk.on("primaryButtonClicked", () => {
        console.log("primaryButtonClicked");
      });

      console.log("Calling ready");
      sdk.actions.ready({});

      // Set up a MIPD Store, and request Providers.
      const store = createStore();

      // Subscribe to the MIPD Store.
      store.subscribe((providerDetails) => {
        console.log("PROVIDER DETAILS", providerDetails);
        // => [EIP6963ProviderDetail, EIP6963ProviderDetail, ...]
      });
    };
    if (sdk && !isSDKLoaded) {
      console.log("Calling load");
      setIsSDKLoaded(true);
      load();
      return () => {
        sdk.removeAllListeners();
      };
    }
  }, [isSDKLoaded, addFrame]);

  if (!isSDKLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <div
      style={{
        paddingTop: context?.client.safeAreaInsets?.top ?? 0,
        paddingBottom: context?.client.safeAreaInsets?.bottom ?? 0,
        paddingLeft: context?.client.safeAreaInsets?.left ?? 0,
        paddingRight: context?.client.safeAreaInsets?.right ?? 0,
      }}
    >
      <div className="w-[300px] mx-auto py-2 px-2">
        <h1 className="text-2xl font-bold text-center mb-4 text-gray-700 dark:text-gray-300">
          {PROJECT_TITLE}
        </h1>
        <QuizCard />
      </div>
    </div>
  );
}
