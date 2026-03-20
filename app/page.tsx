"use client";

import { useState, useEffect } from "react";
import Game from "@/components/Game";

export default function Home() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => {
      const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const narrow = window.innerWidth < 900;
      setIsMobile(touch && narrow);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <main className="game-container">
      <Game isMobile={isMobile} />
    </main>
  );
}
