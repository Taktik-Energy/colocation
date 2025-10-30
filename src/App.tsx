/* eslint-disable */
import Header from "./components/Header";
import Hero from "./components/Hero";
import About from "./components/About";
import ContactForm from "./components/ContactForm";
import PVMap from "./components/PVMap";

const App = () => (
  <div className="min-h-screen bg-background">
    <Header />
    <main>
      <Hero />
      <section id="map" className="py-16 md:py-24 bg-muted/30">
        <div className="container">
          <div className="space-y-4">
            <div className="text-center space-y-2 mb-8">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                PV Projects Map
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Explore PV plants ≥10 MWp. Filter by size, status, and completion date.
              </p>
            </div>
            <PVMap fullScreen={false} />
          </div>
        </div>
      </section>
      <About />
      <ContactForm />
    </main>
  </div>
);

export default App;
