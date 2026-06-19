import { RouterProvider } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { router } from "./routes";

export default function App() {
  return (
    <>
      <RouterProvider router={router} />

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: "rgba(15, 23, 42, 0.82)",
            color: "#ffffff",
            border: "1px solid rgba(255,255,255,0.16)",
            backdropFilter: "blur(18px)",
            boxShadow: "0 18px 50px rgba(15, 23, 42, 0.25)",
            borderRadius: "18px",
            padding: "14px 16px",
            fontSize: "14px",
            fontWeight: 600,
          },
          success: {
            iconTheme: {
              primary: "#16A34A",
              secondary: "#ffffff",
            },
          },
          error: {
            iconTheme: {
              primary: "#DC2626",
              secondary: "#ffffff",
            },
          },
        }}
      />
    </>
  );
}