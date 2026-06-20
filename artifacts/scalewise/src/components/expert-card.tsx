import { Link } from "wouter";
import type { Expert } from "@workspace/api-client-react";

export function ExpertCard({ expert }: { expert: Expert }) {
  return (
    <Link href={`/experts/${expert.id}`}>
      <div className="group relative rounded-3xl border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-1 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative z-10">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-bold text-foreground">{expert.name}</h3>
              <p className="text-sm font-medium text-primary mt-1">{expert.headline}</p>
            </div>
            <div className="flex items-center gap-1 bg-muted px-2 py-1 rounded-full text-sm font-medium">
              <span className="text-yellow-500">★</span>
              <span>{expert.rating.toFixed(1)}</span>
            </div>
          </div>
          
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full bg-secondary/20 px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
              {expert.industry}
            </span>
            <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {expert.yearsExperience} yrs exp
            </span>
          </div>

          {expert.skills && expert.skills.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {expert.skills.slice(0, 3).map((skill: string) => (
                <span key={skill} className="text-xs text-muted-foreground border rounded-md px-2 py-1">
                  {skill}
                </span>
              ))}
              {expert.skills.length > 3 && (
                <span className="text-xs text-muted-foreground border rounded-md px-2 py-1">
                  +{expert.skills.length - 3} more
                </span>
              )}
            </div>
          )}

          <div className="mt-6 flex items-center justify-between border-t pt-4">
            <div className="text-sm text-muted-foreground">
              {expert.totalSessions} sessions
            </div>
            <div className="text-sm font-semibold text-primary group-hover:text-primary/80 transition-colors">
              View Profile →
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
