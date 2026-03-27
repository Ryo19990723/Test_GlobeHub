import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BottomNav } from "@/components/common/BottomNav";
import { MobileFrame } from "@/components/common/MobileFrame";
import { useAuth } from "@/hooks/useAuth";
import Home from "@/pages/Home";
import RecordHome from "./pages/recording/RecordHome";
import TripBasic from "./pages/recording/TripBasic";
import TripEdit from "./pages/recording/TripEdit";
import SpotLocation from "./pages/recording/SpotLocation";
import SpotPhoto from "./pages/recording/SpotPhoto";
import SpotDetail from "./pages/recording/SpotDetail";
import SpotVoice from "./pages/recording/SpotVoice";
import TripCover from "./pages/recording/TripCover";
import TripGeneral from "./pages/recording/TripGeneral";
import TripPreview from "./pages/recording/TripPreview";

import CityList from "./pages/browsing/CityList";
import CityHub from "./pages/browsing/CityHub";
import Search from "./pages/browsing/Search";
import TripDetailPage from "./pages/browsing/TripDetail";

import MyPage from "./pages/mypage/MyPage";
import Login from "./pages/mypage/Login";
import Register from "./pages/mypage/Register";
import EditProfile from "./pages/mypage/EditProfile";
import ForgotPassword from "./pages/mypage/ForgotPassword";

import NotFound from "./pages/NotFound";


function AppContent() {
  useAuth();

  return (
    <MobileFrame>
      <div className="min-h-screen pb-16">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/home" component={Home} />

          <Route path="/record" component={RecordHome} />
          <Route path="/record/drafts" component={RecordHome} />
          <Route path="/record/new" component={TripBasic} />
          <Route path="/record/:tripId" component={TripEdit} />
          <Route path="/record/:tripId/spot/photo" component={SpotPhoto} />
          <Route path="/record/:tripId/spot/loc" component={SpotLocation} />
          <Route path="/record/:tripId/spot/detail" component={SpotDetail} />
          <Route path="/record/:tripId/spot/voice" component={SpotVoice} />
          <Route path="/record/:tripId/cover" component={TripCover} />
          <Route path="/record/:tripId/general" component={TripGeneral} />
          <Route path="/record/:tripId/preview" component={TripPreview} />

          <Route path="/browse" component={CityList} />
          <Route path="/browse/search" component={Search} />
          <Route path="/browse/:cityId" component={CityHub} />
          <Route path="/trips/:id" component={TripDetailPage} />

          <Route path="/saved" component={CityList} />

          <Route path="/mypage" component={MyPage} />
          <Route path="/mypage/login" component={Login} />
          <Route path="/mypage/register" component={Register} />
          <Route path="/mypage/edit" component={EditProfile} />
          <Route path="/mypage/forgot-password" component={ForgotPassword} />

          <Route component={NotFound} />
        </Switch>
        <BottomNav />
      </div>
    </MobileFrame>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
