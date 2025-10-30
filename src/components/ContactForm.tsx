const ContactForm = () => {
  return (
    <section id="contact" className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-6">Contact</h2>
        <form className="grid gap-4 max-w-xl">
          <input className="border border-border rounded px-3 py-2" placeholder="Your email" />
          <textarea className="border border-border rounded px-3 py-2 h-28" placeholder="Message" />
          <button type="button" className="inline-flex items-center justify-center rounded bg-foreground text-background px-4 py-2 text-sm font-medium">
            Send
          </button>
        </form>
      </div>
    </section>
  );
};

export default ContactForm;
