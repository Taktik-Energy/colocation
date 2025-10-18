import { Button } from "@/components/ui/button";

const Header = () => {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <button 
            onClick={() => scrollToSection('hero')}
            className="text-xl font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            Grid Map DE
          </button>
          
          <nav className="hidden md:flex items-center gap-6">
            <button 
              onClick={() => scrollToSection('map')}
              className="text-sm font-medium text-foreground/60 hover:text-foreground transition-colors"
            >
              Map
            </button>
            <button 
              onClick={() => scrollToSection('about')}
              className="text-sm font-medium text-foreground/60 hover:text-foreground transition-colors"
            >
              About
            </button>
            <button 
              onClick={() => scrollToSection('contact')}
              className="text-sm font-medium text-foreground/60 hover:text-foreground transition-colors"
            >
              Contact
            </button>
          </nav>
        </div>

        <Button 
          onClick={() => scrollToSection('contact')}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          Request Access
        </Button>
      </div>
    </header>
  );
};

export default Header;
