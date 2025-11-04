/* eslint-disable */
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import ProjectDetail from "./pages/ProjectDetail";
import WindProjectDetail from "./pages/WindProjectDetail";

const App = () => (
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/project/:id" element={<ProjectDetail />} />
    <Route path="/wind/:id" element={<WindProjectDetail />} />
  </Routes>
);

export default App;
