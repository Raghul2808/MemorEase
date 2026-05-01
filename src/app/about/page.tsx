import { Metadata } from "next";
import AboutClient from "./AboutClient";
import { createMetadata } from "@/lib/seo";

export const metadata: Metadata = createMetadata({
  title: "About MemorEase - Our Mission & Story",
  description:
    "Learn about MemorEase's mission to make powerful study tools free and accessible for every student. Built by students, for students.",
  path: "/about",
});

export default function AboutPage() {
  return <AboutClient />;
}
