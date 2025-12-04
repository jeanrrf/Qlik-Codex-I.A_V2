// web/src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App";
import "./styles.css";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "166030476995-vnergcpr9cgduakphgd1l6o1q6khnlpa.apps.googleusercontent.com";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <ConvexProvider client={convex}>
        <App />
      </ConvexProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>
);
