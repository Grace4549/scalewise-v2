import { Router, type IRouter } from "express";
import { db, reviewsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { CreateReviewBody, ListReviewsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/reviews", async (req, res): Promise<void> => {
  const params = ListReviewsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  let reviews;
  if (params.data.expertId) {
    reviews = await db
      .select()
      .from(reviewsTable)
      .where(eq(reviewsTable.expertId, params.data.expertId))
      .orderBy(reviewsTable.createdAt);
  } else {
    reviews = await db
      .select()
      .from(reviewsTable)
      .orderBy(reviewsTable.createdAt);
  }

  res.json(
    reviews.map((r) => ({
      id: r.id,
      reviewerName: r.reviewerName,
      businessName: r.businessName ?? null,
      expertId: r.expertId ?? null,
      rating: r.rating,
      body: r.body,
      createdAt: r.createdAt.toISOString(),
    }))
  );
});

router.post("/reviews", async (req, res): Promise<void> => {
  const parsed = CreateReviewBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [review] = await db
    .insert(reviewsTable)
    .values({
      reviewerName: parsed.data.reviewerName,
      businessName: parsed.data.businessName ?? null,
      expertId: parsed.data.expertId ?? null,
      rating: parsed.data.rating,
      body: parsed.data.body,
    })
    .returning();

  res.status(201).json({
    id: review.id,
    reviewerName: review.reviewerName,
    businessName: review.businessName ?? null,
    expertId: review.expertId ?? null,
    rating: review.rating,
    body: review.body,
    createdAt: review.createdAt.toISOString(),
  });
});

router.delete("/reviews/:id", requireAuth, async (req, res): Promise<void> => {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db.delete(reviewsTable).where(eq(reviewsTable.id, id));
  res.sendStatus(204);
});

export default router;
