import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import bg from "../assets/images/bg2.png";
import logo from "../assets/images/logo.png";
import Navbar from "../component/Navbar";

const SPINNER_SEGMENTS = new Array(10).fill(null).map((_, index) => ({
  id: `spinner-segment-${index + 1}`,
  rotation: 36 * (index + 1),
  delay: index * 0.1,
}));

const Loading = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      navigate("/login", { replace: true });
    }, 5000);

    return () => clearTimeout(timeoutId);
  }, [navigate]);

  return (
    <div className="app-page-with-navbar">
      <Navbar />
      <div className="relative w-full h-screen overflow-hidden">
      {/* Background */}
      <img
        src={bg}
        alt="Background"
        className="absolute inset-0 w-full h-full object-cover"
      />

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {/* Logo */}
        <img
          src={logo}
          alt="Logo"
          className="w-52 mb-10"
        />

        {/* Spinner */}
        <div className="relative w-10 h-10">
          {SPINNER_SEGMENTS.map((segment) => (
            <div
              key={segment.id}
              className="absolute left-1/2 top-1/2 w-[3px] h-[14px] rounded-full bg-[#006664] origin-bottom animate-pulse"
              style={{
                transform: `translate(-50%, -100%) rotate(${segment.rotation}deg) translateY(-14px)`,
                animationDelay: `${segment.delay}s`,
                animationDuration: "1s",
              }}
            />
          ))}
        </div>
      </div>
      </div>
    </div>
  );
};

export default Loading;
