import React, { useState } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import background from "../assets/images/bg2.png";
import logo from "../assets/images/logo.png";
import "./Login.css";
import Navbar from "../component/Navbar";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState(location.state?.message || "");
  const [messageOtp, setMessageOtp] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showOtp, setShowOtp] = useState(false);

  const sendOTP = async () => {
    if (!email.trim()) {
      setMessage("กรุณากรอกชื่อผู้ใช้ก่อน");
      return;
    }

    try {
      setIsSending(true);
      setMessage("");
      setMessageOtp("");
      localStorage.removeItem("isLoggedIn");
      const response = await axios.post("http://localhost:3000/api/send-otp", {
        email: email.trim(),
      });

      if (response.data.success) {
        setMessage("ส่งรหัส OTP ไปยังอีเมลของคุณแล้ว");
      }
    } catch (error) {
      setMessage(
        error.response?.data?.message || "ไม่สามารถส่งรหัส OTP ได้ กรุณาลองอีกครั้ง"
      );
    } finally {
      setIsSending(false);
    }
  };

  const verifyOTP = async () => {
    try {
      setIsVerifying(true);
      setMessageOtp("");
      await axios.post("http://localhost:3000/api/verify-otp", {
        email: email.trim(),
        otp: otp.trim(),
      });

      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("email", email.trim());
      setMessageOtp("ยืนยันตัวตนสำเร็จ กำลังพาไปหน้ารายการ…");
      setTimeout(() => navigate("/foundPage"), 900);
    } catch (error) {
      setMessageOtp(
        error.response?.data?.message || "รหัส OTP ไม่ถูกต้อง กรุณาลองอีกครั้ง"
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!email.trim() || !otp.trim()) {
      setMessageOtp("กรุณากรอกชื่อผู้ใช้และรหัส OTP ให้ครบถ้วน");
      return;
    }

    await verifyOTP();
  };

  return (
    <div className="app-page-with-navbar">
      <Navbar />
      <main className="login-page">
      <section className="login-shell" aria-label="เข้าสู่ระบบ FOUND&LOST">
        <img className="login-background" src={background} alt="" aria-hidden="true" />

        <div className="login-brand">
          <img src={logo} alt="KU Found and Lost" />
        </div>

        <section className="login-card">
          <div className="login-card-heading">
            <span className="login-back" aria-hidden="true">‹</span>
            <h1>เข้าสู่ระบบ</h1>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <label htmlFor="email">ชื่อผู้ใช้</label>
            <div className="email-field-row">
              <input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="กรอก username ของคุณ"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <button
                className="send-otp-button"
                type="button"
                onClick={sendOTP}
                disabled={isSending}
              >
                {isSending ? "กำลังส่ง" : "ส่ง OTP"}
              </button>
            </div>
            {message && <p className="login-message" role="status">{message}</p>}

            <label htmlFor="otp">รหัส OTP</label>
            <div className="password-field">
              <input
                id="otp"
                type={showOtp ? "text" : "password"}
                autoComplete="one-time-code"
                placeholder="กรอกรหัส OTP 6 หลัก"
                maxLength={6}
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
              />
              <button
                className="password-visibility"
                type="button"
                onClick={() => setShowOtp((current) => !current)}
                aria-label={showOtp ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
              >
                {showOtp ? "◉" : "⌧"}
              </button>
            </div>

            <button className="login-submit" type="submit" disabled={isSending || isVerifying}>
              {isSending ? "กำลังส่งรหัส" : isVerifying ? "กำลังเข้าสู่ระบบ" : "เข้าสู่ระบบ"}
            </button>
            {messageOtp && <p className="login-message login-message--otp" role="status">{messageOtp}</p>}
          </form>

          <div className="login-divider"><span>หรือเข้าสู่ระบบด้วย</span></div>
          <button
            className="google-button"
            type="button"
            onClick={() => setMessageOtp("ระบบลงชื่อเข้าใช้ด้วย Google ยังไม่เปิดใช้งาน")}
          >
            <span className="google-mark" aria-hidden="true">G</span>
            Google
          </button>
        </section>
      </section>
      </main>
    </div>
  );
};

export default Login;