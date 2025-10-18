import { Button } from "@/components/ui/button";
import { ArrowDown } from "lucide-react";

const Hero = () => {
  const scrollToMap = () => {
    const element = document.getElementById('map');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="hero" className="py-20 md:py-32">
      <div className="container">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground">
            Germany's Grid Expansion — at a glance
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Planned lines, substations, and projects by DSO. Interactive map coming soon.
          </p>
          <Button 
            onClick={scrollToMap}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
          >
            View Map
            <ArrowDown className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Hero;
