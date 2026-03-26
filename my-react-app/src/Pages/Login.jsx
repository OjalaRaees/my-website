import { useNavigate } from "react-router-dom";

export default function Login() {
    const navigate = useNavigate();

    function handleLogin() {
    localStorage.setItem("isLoggedIn", "true");
    navigate("/dashboard");
    }

    return (
    <>
        <h1>Login Page</h1>
        <button onClick={handleLogin}>Login</button>
    </>
    );
}
