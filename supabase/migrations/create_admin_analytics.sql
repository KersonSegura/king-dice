-- Track page views for admin analytics
CREATE TABLE IF NOT EXISTS public.analytics_page_views (
  id BIGSERIAL PRIMARY KEY,
  path TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'web',
  user_id TEXT NULL,
  session_id TEXT NULL,
  country_code TEXT NULL,
  region TEXT NULL,
  city TEXT NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_page_views_created_at
  ON public.analytics_page_views (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_page_views_path_created_at
  ON public.analytics_page_views (path, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_page_views_source_created_at
  ON public.analytics_page_views (source, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_page_views_country_city_created_at
  ON public.analytics_page_views (country_code, city, created_at DESC);

-- RLS: no direct public access; admin API uses service role.
ALTER TABLE public.analytics_page_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deny_all_analytics_page_views" ON public.analytics_page_views;
CREATE POLICY "deny_all_analytics_page_views"
ON public.analytics_page_views
FOR ALL
USING (false)
WITH CHECK (false);

-- Database size (bytes) for admin dashboard.
CREATE OR REPLACE FUNCTION public.get_database_size_bytes()
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT pg_database_size(current_database())::BIGINT;
$$;

REVOKE ALL ON FUNCTION public.get_database_size_bytes() FROM PUBLIC;

-- Aggregated analytics for admin dashboard.
CREATE OR REPLACE FUNCTION public.get_admin_analytics_summary(
  p_since TIMESTAMPTZ DEFAULT (NOW() - INTERVAL '30 days'),
  p_top_n INTEGER DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'active_24h', (
      SELECT COUNT(DISTINCT COALESCE(user_id, session_id))
      FROM public.analytics_page_views
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    ),
    'active_7d', (
      SELECT COUNT(DISTINCT COALESCE(user_id, session_id))
      FROM public.analytics_page_views
      WHERE created_at >= NOW() - INTERVAL '7 days'
    ),
    'top_links', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'path', s.path,
          'visits', s.visits
        )
        ORDER BY s.visits DESC, s.path ASC
      )
      FROM (
        SELECT path, COUNT(*)::INT AS visits
        FROM public.analytics_page_views
        WHERE created_at >= p_since
        GROUP BY path
        ORDER BY visits DESC, path ASC
        LIMIT p_top_n
      ) s
    ), '[]'::jsonb),
    'top_locations', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'country_code', s.country_code,
          'city', s.city,
          'visits', s.visits
        )
        ORDER BY s.visits DESC, s.country_code ASC, s.city ASC
      )
      FROM (
        SELECT
          COALESCE(NULLIF(country_code, ''), 'Unknown') AS country_code,
          COALESCE(NULLIF(city, ''), 'Unknown') AS city,
          COUNT(*)::INT AS visits
        FROM public.analytics_page_views
        WHERE created_at >= p_since
        GROUP BY COALESCE(NULLIF(country_code, ''), 'Unknown'), COALESCE(NULLIF(city, ''), 'Unknown')
        ORDER BY visits DESC, country_code ASC, city ASC
        LIMIT p_top_n
      ) s
    ), '[]'::jsonb),
    'source_breakdown', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'source', s.source,
          'visits', s.visits
        )
        ORDER BY s.visits DESC, s.source ASC
      )
      FROM (
        SELECT COALESCE(NULLIF(source, ''), 'web') AS source, COUNT(*)::INT AS visits
        FROM public.analytics_page_views
        WHERE created_at >= p_since
        GROUP BY COALESCE(NULLIF(source, ''), 'web')
        ORDER BY visits DESC, source ASC
      ) s
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_analytics_summary(TIMESTAMPTZ, INTEGER) FROM PUBLIC;

