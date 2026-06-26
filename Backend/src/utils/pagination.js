// Safe pagination for PostgREST / supabase-js list endpoints.
//
// PostgREST returns HTTP 416 with error code "PGRST103" ("Requested range not
// satisfiable") when you ask for a page that starts beyond the last row — e.g.
// offset=10 when only 5 rows exist. supabase-js surfaces that as an `error`, and
// a naive `if (error) throw error` turns a perfectly normal "empty next page"
// into a 500. (This is exactly what broke GET /api/v1/lifestyle?offset=10 for the
// mobile app's infinite scroll.)
//
// `rangeOrEmpty` runs the already-built+ranged data query and, on PGRST103,
// returns an empty page together with the true total (via a cheap head count)
// instead of throwing.
//
// Usage:
//   const applyFilters = (qb) => { ...; return qb; };
//   const dataQuery = applyFilters(
//     db.from('t').select('cols', { count: 'exact' })
//   ).order(...).range(offset, offset + limit - 1);
//   const { rows, total } = await rangeOrEmpty(dataQuery, () =>
//     applyFilters(db.from('t').select('id', { count: 'exact', head: true }))
//   );

export async function rangeOrEmpty(dataQuery, countQueryFactory) {
  const { data, count, error } = await dataQuery;
  if (!error) return { rows: data ?? [], total: count ?? 0 };

  if (error.code === 'PGRST103') {
    let total = 0;
    if (typeof countQueryFactory === 'function') {
      const { count: c } = await countQueryFactory();
      total = c ?? 0;
    }
    return { rows: [], total };
  }

  throw error;
}
