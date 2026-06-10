import { useEffect, useState } from "react";

const VietnamDateTime = () => {
  const [vnTime, setVnTime] = useState("");

  useEffect(() => {
    const updateVietnamTime = () => {
      const now = new Date();

      const datePart = new Intl.DateTimeFormat("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(now);

      const timePart = new Intl.DateTimeFormat("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(now);

      const [day, month, year] = datePart.split("/");
      setVnTime(`${day}-${month}-${year} ${timePart}`);
    };

    updateVietnamTime();

    const timer = window.setInterval(() => {
      updateVietnamTime();
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  return <>{vnTime}</>;
};

export default VietnamDateTime;
