/* Full-screen dark background covering the entire desktop */
.pageWrapper {
  min-height: 100vh;
  width: 100%;
  background: #0a0a12;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

/* Glowing background blobs */
.blobPurple {
  position: absolute;
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.25) 0%, transparent 70%);
  top: -100px;
  left: -100px;
  pointer-events: none;
}

.blobBlue {
  position: absolute;
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%);
  bottom: -80px;
  right: -80px;
  pointer-events: none;
}

/* Login card — same design as screenshot, now centered on full screen */
.card {
  position: relative;
  z-index: 10;
  background: rgba(22, 22, 35, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 40px 36px 32px;
  width: 100%;
  max-width: 340px;
  box-shadow:
    0 25px 60px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(255, 255, 255, 0.04) inset;
  backdrop-filter: blur(20px);
  text-align: center;
}

/* Logo icon */
.logoWrapper {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}

.logo {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: linear-gradient(135deg, #a855f7 0%, #6366f1 50%, #3b82f6 100%);
  box-shadow: 0 8px 24px rgba(139, 92, 246, 0.45);
}

.title {
  color: #ffffff;
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 6px;
  letter-spacing: -0.3px;
}

.subtitle {
  color: rgba(255, 255, 255, 0.45);
  font-size: 13px;
  margin: 0 0 28px;
}

/* Form */
.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  text-align: left;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.label {
  color: rgba(255, 255, 255, 0.65);
  font-size: 13px;
  font-weight: 500;
}

.input {
  width: 100%;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: #ffffff;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s, background 0.2s;
  box-sizing: border-box;
}

.input::placeholder {
  color: rgba(255, 255, 255, 0.25);
}

.input:focus {
  border-color: rgba(139, 92, 246, 0.6);
  background: rgba(255, 255, 255, 0.09);
}

.passwordWrapper {
  position: relative;
}

.passwordWrapper .input {
  padding-right: 42px;
}

.eyeBtn {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  transition: color 0.2s;
}

.eyeBtn:hover {
  color: rgba(255, 255, 255, 0.75);
}

/* Sign In button */
.signInBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px;
  margin-top: 4px;
  background: linear-gradient(135deg, #7c3aed, #6366f1);
  border: none;
  border-radius: 12px;
  color: #ffffff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.15s;
  box-shadow: 0 4px 18px rgba(99, 102, 241, 0.45);
}

.signInBtn:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.signInBtn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Loading spinner */
.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Footer text */
.footer {
  color: rgba(255, 255, 255, 0.2);
  font-size: 12px;
  margin: 24px 0 0;
}
