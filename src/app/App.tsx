import { RouterProvider } from "react-router-dom";

import { Toaster } from "sonner";
import { router } from "./router";

export function App() {
  return (
    <>
      <Toaster
        position="top-center"
        richColors
        expand={false}
        toastOptions={{
          duration: 3000,
        }}
      />
      <RouterProvider router={router} />
    </>
  );
}
