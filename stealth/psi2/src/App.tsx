import { BrowserRouter } from "react-router-dom";
import Sidebar from "./components/layout/Sidebar";
import AppRoutes from "./routes/AppRoutes";

export default function App() {
  return (
    <BrowserRouter>
      <div
        style={{
          display: "flex",
          minHeight: "100vh",
          background: "#F4F2ED",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <Sidebar />
        <main style={{ flex: 1, overflowY: "auto" }}>
          <AppRoutes />
        </main>
      </div>
    </BrowserRouter>
  );
}
