CREATE TABLE public.reviews (
  id text PRIMARY KEY,
  author text NOT NULL,
  source text NOT NULL,
  rating numeric(2,1) NOT NULL CHECK (rating >= 1 AND rating <= 5 AND rating * 2 = trunc(rating * 2)),
  content text NOT NULL,
  review_date date NOT NULL,
  created_at timestamptz NOT NULL
);
CREATE INDEX reviews_sort_idx ON public.reviews(review_date DESC,created_at DESC,id DESC);
CREATE INDEX reviews_rating_sort_idx ON public.reviews(rating,review_date DESC,created_at DESC,id DESC);
CREATE TABLE public.review_stats (
  rating numeric(2,1) PRIMARY KEY,
  count bigint NOT NULL CHECK(count >= 0)
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_stats ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.reviews FROM anon, authenticated;
REVOKE ALL ON public.review_stats FROM anon, authenticated;
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT SELECT ON public.review_stats TO anon, authenticated;
CREATE POLICY review_public_read ON public.reviews FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY review_stats_public_read ON public.review_stats FOR SELECT TO anon, authenticated USING (true);
CREATE FUNCTION public.maintain_review_stats() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.review_stats(rating,count) VALUES (NEW.rating,1)
      ON CONFLICT(rating) DO UPDATE SET count=public.review_stats.count+1;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.review_stats SET count=count-1 WHERE rating=OLD.rating;
    RETURN OLD;
  ELSIF NEW.rating IS DISTINCT FROM OLD.rating THEN
    UPDATE public.review_stats SET count=count-1 WHERE rating=OLD.rating;
    INSERT INTO public.review_stats(rating,count) VALUES (NEW.rating,1)
      ON CONFLICT(rating) DO UPDATE SET count=public.review_stats.count+1;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.maintain_review_stats() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER reviews_stats_after_insert AFTER INSERT ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.maintain_review_stats();
CREATE TRIGGER reviews_stats_after_delete AFTER DELETE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.maintain_review_stats();
CREATE TRIGGER reviews_stats_after_rating AFTER UPDATE OF rating ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.maintain_review_stats();
