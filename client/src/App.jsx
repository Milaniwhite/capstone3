import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { HomePage } from "./components/HomePage";
import { AdminDashboard } from "./components/AdminDashboard";
import { Navigation } from "./components/Navigation";
import { useAuth } from "./hooks/useAuth";
import { ItemDetailPage } from "./pages/ItemDetailsPage";
import { CreateItemPage } from "./pages/CreateItemPage";
const App = () => {
  const { auth, login, register, logout, isAdmin } = useAuth();

  return (
    <>
      <Navigation auth={auth} isAdmin={isAdmin} logout={logout} />

      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage login={login} />} />
          <Route
            path="/signup"
            element={<RegisterPage register={register} />}
          />
          <Route path="/items/:id" element={<ItemDetailPage />} />
          <Route path="/items/new" element={<CreateItemPage />} />
          <Route
            path="/admin"
            element={isAdmin ? <AdminDashboard /> : <Navigate to="/" replace />}
          />
        </Routes>
      </main>
    </>
  );
};

export default App;
