import Header from "@/components/Header";
import Hero from "@/components/Hero";
import MapPlaceholder from "@/components/MapPlaceholder";
import About from "@/components/About";
import ContactForm from "@/components/ContactForm";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <MapPlaceholder />
        <About />
        <ContactForm />
      </main>
    </div>
  );
};

export default Index;
