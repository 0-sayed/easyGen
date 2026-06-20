import { Navigate, Route, Routes } from "react-router-dom";

import "./index.css";
import { AuthProvider } from "./auth/AuthProvider";
import { RequireAuth } from "./auth/RequireAuth";
import { ApplicationPage } from "./pages/ApplicationPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { SigninPage } from "./pages/SigninPage";
import { SignupPage } from "./pages/SignupPage";
import { BuildInfoBadge } from "./status/BuildInfoBadge";

export function App() {
  return (
    <AuthProvider>
      <main className="grid min-h-screen place-items-center bg-page p-4 sm:p-6">
        <div className="grid w-full justify-items-center gap-3">
          <Routes>
            <Route path="/" element={<Navigate to="/signin" replace />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/signin" element={<SigninPage />} />
            <Route element={<RequireAuth />}>
              <Route path="/app" element={<ApplicationPage />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          <BuildInfoBadge />
        </div>
      </main>
    </AuthProvider>
  );
}
