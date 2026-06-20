import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function About() {
  return (
    <div className="py-24 container mx-auto px-4 max-w-4xl">
      <div className="text-center mb-16 space-y-4">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          We Built This Because Business Owners Deserve Better Than Guesswork
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          ScaleWise isn't another consulting firm. It's the partner you wish you had — one who has already been exactly where you are, and is one call away.
        </p>
      </div>

      <div className="space-y-16 text-lg leading-relaxed">
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Our Story</h2>
          <p>
            Running a business is incredibly lonely. When you hit a wall—whether it's managing cash flow, dealing with staff turnover, or figuring out how to scale without breaking—you don't need a textbook theory. You need someone who has stared at the exact same ceiling, worried about the exact same things, and found a way through.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Our Mission</h2>
          <p>
            To connect ambitious business owners with real, lived expertise, turning hard-earned lessons into actionable growth.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">For Business Owners</h2>
          <p>
            You get direct access to seasoned founders and operators. No retainers, no long-term contracts unless you want them. Just book a session, ask your hardest questions, and get real answers.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">For Experts</h2>
          <p>
            Your scars and successes have value. ScaleWise gives you a platform to monetize your experience on your own terms, helping the next generation of businesses succeed.
          </p>
        </section>

        <div className="bg-muted p-8 rounded-3xl text-center space-y-6">
          <h3 className="text-2xl font-bold text-primary">"You're not alone in this. Not anymore."</h3>
          <div>
            <p className="font-semibold">Grace Kihonge</p>
            <p className="text-muted-foreground text-sm">Founder & CEO, ScaleWise</p>
          </div>
        </div>
      </div>
    </div>
  );
}
