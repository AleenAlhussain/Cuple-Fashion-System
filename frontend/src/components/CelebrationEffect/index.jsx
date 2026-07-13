"use client";
import ThemeOptionContext from "@/context/themeOptionsContext";
import useCartState from "@/states/CartState";
import { useContext, useEffect, useMemo, useState } from "react";

const confettiItems = Array.from({ length: 150 }, (_, index) => index);

const CelebrationEffect = () => {
  const { themeOption } = useContext(ThemeOptionContext);
  const celebrationCount = useCartState((state) => state.celebrationCount);
  const [isVisible, setIsVisible] = useState(false);

  const celebrationEnabled = useMemo(
    () => themeOption?.general?.celebration_effect ?? true,
    [themeOption?.general?.celebration_effect]
  );

  useEffect(() => {
    if (!celebrationEnabled || celebrationCount === 0) return;
    setIsVisible(true);
    const timer = setTimeout(() => setIsVisible(false), 4500);
    return () => clearTimeout(timer);
  }, [celebrationCount, celebrationEnabled]);

  if (!celebrationEnabled) return null;

  return (
    <div className={`confetti-wrapper ${isVisible ? "show" : ""}`}>
      {confettiItems.map((elem) => (
        <div key={elem} className={`confetti-${elem}`}></div>
      ))}
    </div>
  );
};

export default CelebrationEffect;
