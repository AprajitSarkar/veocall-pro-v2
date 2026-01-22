import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/video/:roomId" element={<Index />} />
          <Route path="/audio/:roomId" element={<Index />} />

          {/* Sub-pages handled by Index logic */}
          <Route path="/setting" element={<Index />} />
          <Route path="/settings" element={<Index />} />
          <Route path="/join" element={<Index />} />
          <Route path="/recent" element={<Index />} />
          <Route path="/search" element={<Index />} />
          <Route path="/scan" element={<Index />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
