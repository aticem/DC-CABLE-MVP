import { useState, useEffect } from "react";

export default function useDailyLog() {
  const [dailyLog, setDailyLog] = useState([]);

  useEffect(() => {
    const stored = localStorage.getItem("dailyLog");
    if (stored) {
      try {
        setDailyLog(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse dailyLog", e);
      }
    }
  }, []);

  const addRecord = (record) => {
    const updated = [...dailyLog, record];
    setDailyLog(updated);
    localStorage.setItem("dailyLog", JSON.stringify(updated));
  };

  const resetLog = () => {
    localStorage.removeItem("dailyLog");
    setDailyLog([]);
  };

  return { dailyLog, addRecord, resetLog };
}
