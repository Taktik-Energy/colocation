const Header = () => {
  return (
    <header className="w-full border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="text-lg font-semibold tracking-tight">Grid Map DE</div>
        <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
          <a href="#map" className="hover:text-foreground">Map</a>
          <a href="#about" className="hover:text-foreground">About</a>
          <a href="#contact" className="hover:text-foreground">Contact</a>
        </nav>
      </div>
    </header>
  );
};

export default Header;
