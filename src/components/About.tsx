const About = () => {
  return (
    <section id="about" className="py-16 md:py-24">
      <div className="container">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            About Grid Map DE
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            We aggregate public DSO expansion plans and basic grid context to visualize where projects are planned. 
            Always verify with the responsible DSO.
          </p>
        </div>
      </div>
    </section>
  );
};

export default About;
