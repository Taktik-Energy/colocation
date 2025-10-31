/* eslint-disable */
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import ProjectDetail from "./pages/ProjectDetail";

const App = () => (
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/project/:id" element={<ProjectDetail />} />
  </Routes>
);

export default App;
