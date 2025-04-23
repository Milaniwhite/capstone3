import { useState, useEffect } from "react";

export const useAuth = () => {
  const [auth, setAuth] = useState({});
  const [error, setError] = useState("");

  useEffect(() => {
    attemptLoginWithToken();
  }, []);

  const attemptLoginWithToken = async () => {
    const token = window.localStorage.getItem("token");
    if (token) {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const userData = await response.json();
          setAuth({ token, user: userData });
        } else {
          window.localStorage.removeItem("token");
          setAuth({});
        }
      } catch (err) {
        console.error("Error fetching user profile:", err);
        window.localStorage.removeItem("token");
        setAuth({});
      }
    }
  };

  const login = async ({ email, password }) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      window.localStorage.setItem("token", data);
      await attemptLoginWithToken();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const register = async ({ username, email, password, full_name }) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, email, password, full_name }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }

      await login({ email, password });
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const logout = () => {
    window.localStorage.removeItem("token");
    setAuth({});
  };

  const isAdmin = auth.user?.role === "admin";

  return {
    auth: {
      ...auth,
      id: auth.user?.id,
      token: auth.token,
    },
    login,
    register,
    logout,
    error,
    isAdmin,
  };
};
