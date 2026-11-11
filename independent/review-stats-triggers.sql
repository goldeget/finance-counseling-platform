CREATE TRIGGER IF NOT EXISTS review_stats_insert AFTER INSERT ON reviews BEGIN
  INSERT INTO review_stats(rating,count) VALUES(NEW.rating,1)
  ON CONFLICT(rating) DO UPDATE SET count=count+1;
END;
CREATE TRIGGER IF NOT EXISTS review_stats_delete AFTER DELETE ON reviews BEGIN
  UPDATE review_stats SET count=count-1 WHERE rating=OLD.rating;
END;
CREATE TRIGGER IF NOT EXISTS review_stats_rating_update AFTER UPDATE OF rating ON reviews
WHEN NEW.rating <> OLD.rating BEGIN
  UPDATE review_stats SET count=count-1 WHERE rating=OLD.rating;
  INSERT INTO review_stats(rating,count) VALUES(NEW.rating,1)
  ON CONFLICT(rating) DO UPDATE SET count=count+1;
END;
