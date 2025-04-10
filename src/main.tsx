import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { ThemeProvider } from "./components/theme-provider.tsx";
import "./index.css";

// const router = createBrowserRouter([{ path: "/gagageul", element: <App /> }]);

ReactDOM.createRoot(document.getElementById("root")!).render(
	<ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
		<div className="min-h-screen bg-background text-foreground font-sans">
			<App />
		</div>
	</ThemeProvider>
);
