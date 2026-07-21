import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { track } from "@/lib/analytics";

// Code-split heavy routes so initial bundle stays small on mobile.
const Index = lazy(() => import("./pages/Index"));
const Store = lazy(() => import("./pages/Store"));
const Wholesale = lazy(() => import("./pages/Wholesale"));
const About = lazy(() => import("./pages/About"));
const Support = lazy(() => import("./pages/Support"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Mango = lazy(() => import("./pages/Mango"));
const Orange = lazy(() => import("./pages/Orange"));
const MixedFruit = lazy(() => import("./pages/MixedFruit"));
const Yogurt = lazy(() => import("./pages/Yogurt"));
const Apple = lazy(() => import("./pages/Apple"));
const Tamarind = lazy(() => import("./pages/Tamarind"));
const Water = lazy(() => import("./pages/Water"));
const AdminAnalytics = lazy(() => import("./pages/AdminAnalytics"));
const AdminOrders = lazy(() => import("./pages/AdminOrders"));
const Admin = lazy(() => import("./pages/Admin"));
const Delivery = lazy(() => import("./pages/Delivery"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Order = lazy(() => import("./pages/Order"));
const Track = lazy(() => import("./pages/Track"));

const Fallback = () => <div className="min-h-screen bg-[hsl(var(--paper))]" />;

function PageViewTracker() {
  const location = useLocation();
  useEffect(() => {
    void track("page_view", { path: location.pathname }, location.pathname);
  }, [location.pathname]);
  return null;
}

const LegacyApp = () => (
  <HelmetProvider>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <PageViewTracker />
        <Suspense fallback={<Fallback />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/store" element={<Store />} />
            <Route path="/wholesale" element={<Wholesale />} />
            <Route path="/about" element={<About />} />
            <Route path="/support" element={<Support />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/analytics" element={<AdminAnalytics />} />
            <Route path="/admin/orders" element={<AdminOrders />} />
            <Route path="/delivery" element={<Delivery />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/order/:id" element={<Order />} />
            <Route path="/track" element={<Track />} />
            <Route path="/mango" element={<Mango />} />
            <Route path="/orange" element={<Orange />} />
            <Route path="/mixed-fruit" element={<MixedFruit />} />
            <Route path="/yogurt" element={<Yogurt />} />
            <Route path="/apple" element={<Apple />} />
            <Route path="/tamarind" element={<Tamarind />} />
            <Route path="/water" element={<Water />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </HelmetProvider>
);

export default LegacyApp;
