const MapPlaceholder = () => {
  return (
    <section id="map" className="py-16 md:py-24 bg-muted/30">
      <div className="container">
        <div className="space-y-4">
          <div className="w-full min-h-[420px] md:min-h-[600px] bg-card rounded-lg border-2 border-dashed border-border flex items-center justify-center shadow-sm">
            <div className="text-center space-y-2 p-8">
              <div className="text-2xl font-semibold text-muted-foreground">
                Map Placeholder
              </div>
              <div className="text-sm text-muted-foreground max-w-md">
                This area is reserved for the interactive map
              </div>
            </div>
          </div>
          
          <div className="bg-card rounded-lg border border-border p-4 text-sm text-muted-foreground font-mono">
            <div className="space-y-1">
              <div className="text-foreground font-semibold mb-2">// Insert later:</div>
              <div>// Option A: iframe embed from your map app</div>
              <div>// Option B: Framer Code component mounting &lt;div id="map-root"&gt;&lt;/div&gt;</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MapPlaceholder;
