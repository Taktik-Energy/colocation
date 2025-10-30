const About = () => {
  return (
    <section id="about" className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl space-y-4">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">About</h2>
          <p className="text-muted-foreground">
            This project provides a lightweight map of Germany using Leaflet. You can place points and lines
            by coordinates. The sample dataset has been cleared so you can plug in your own data.
          </p>
        </div>
      </div>
    </section>
  );
};

export default About;
