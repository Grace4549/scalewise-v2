import { Button } from "@/components/ui/button";

export default function Contact() {
  return (
    <div className="py-24 container mx-auto px-4 max-w-2xl text-center">
      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">Get in Touch</h1>
      <p className="text-xl text-muted-foreground mb-12">
        Whether you have a question about the platform, need help with a booking, or just want to say hello, we're here.
      </p>
      
      <div className="p-12 rounded-3xl bg-card border shadow-sm space-y-6">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
        </div>
        <h2 className="text-2xl font-bold">Email Us</h2>
        <p className="text-muted-foreground">We aim to respond to all inquiries within 24 hours.</p>
        <a href="mailto:hello@scalewise.co.ke" className="inline-block mt-4">
          <Button size="lg" className="rounded-xl px-8 h-14 text-lg">
            Email hello@scalewise.co.ke
          </Button>
        </a>
      </div>
    </div>
  );
}
