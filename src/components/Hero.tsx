const Hero = () => {
  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4 text-center space-y-4">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
          Germany's Grid Map
        </h1>
        <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
          Explore a map of Germany and place objects by coordinates. All demo data has been removed.
        </p>
        <div className="pt-2">
          <a href="#map" className="inline-block px-4 py-2 rounded bg-foreground text-background text-sm font-medium">
            Jump to Map
          </a>
        </div>
      </div>
    </section>
  );
};

export default Hero;
