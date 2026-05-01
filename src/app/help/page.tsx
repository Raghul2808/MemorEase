import { Metadata } from "next";
import HelpClient from "./HelpClient";
import { createMetadata } from "@/lib/seo";

export const metadata: Metadata = createMetadata({
  title: "Help Center - MemorEase",
  description:
    "Get help with MemorEase's study tools. Learn how to use flashcards, practice tests, reviewers, pomodoro timer, and more.",
  path: "/help",
});

export default function HelpPage() {
  return <HelpClient />;
}
