import { useState } from "react";

function isDarkMode() {
  return document.documentElement.classList.contains("dark");
}

function applyDark(on: boolean) {
  if (on) document.documentElement.classList.add("dark");
  else document.documentElement.classList.remove("dark");
  localStorage.setItem("darkMode", String(on));
}

export function useDarkMode() {
  const [dark, setDark] = useState(isDarkMode);

  function toggleDark() {
    const next = !isDarkMode();
    applyDark(next);
    setDark(next);
  }

  return { dark, toggleDark };
}
