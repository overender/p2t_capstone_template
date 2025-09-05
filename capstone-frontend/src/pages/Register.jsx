import { useState } from "react";
import api from "../api";
import { useAuth } from "../store/auth";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = useAuth((s) => s.login);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    const { data } = await api.post("/auth/register", { name, email, password }); // {token,user}
    login(data);
    navigate("/");
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 360, margin: "2rem auto", display: "grid", gap: "0.75rem" }}>
      <h1>Create account</h1>
      <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
      <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      <button type="submit">Register</button>
    </form>
  );
}
