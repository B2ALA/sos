const supabase = require("../config/supabase");
const { asyncHandler } = require("../middleware/errorHandler");

// Haversine distance in kilometers
function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Builds a full CRUD-ish controller for a simple lookup table:
 *  - list (with optional text filters + "near me" sorting)
 *  - getById
 *  - create (admin)
 *  - update (admin)
 *  - remove (admin)
 *
 * @param {string} table - Supabase table name
 * @param {string[]} filterableColumns - columns that support ?column=value exact/ilike filtering
 */
function buildDirectoryController(table, filterableColumns = []) {
  const list = asyncHandler(async (req, res) => {
    let query = supabase.from(table).select("*");

    filterableColumns.forEach((col) => {
      const value = req.query[col];
      if (value) query = query.ilike(col, `%${value}%`);
    });

    const { data, error } = await query;
    if (error) throw error;

    const { lat, lng, radiusKm } = req.query;
    let results = data;

    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      results = results
        .map((row) => ({
          ...row,
          distanceKm: row.latitude && row.longitude
            ? +distanceKm(userLat, userLng, row.latitude, row.longitude).toFixed(2)
            : null
        }))
        .filter((row) => (radiusKm ? row.distanceKm === null || row.distanceKm <= parseFloat(radiusKm) : true))
        .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    }

    res.json({ success: true, count: results.length, data: results });
  });

  const getById = asyncHandler(async (req, res) => {
    const { data, error } = await supabase.from(table).select("*").eq("id", req.params.id).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, message: `${table} record not found.` });
    res.json({ success: true, data });
  });

  const create = asyncHandler(async (req, res) => {
    const { data, error } = await supabase.from(table).insert(req.body).select().single();
    if (error) throw error;
    res.status(201).json({ success: true, data });
  });

  const update = asyncHandler(async (req, res) => {
    const { data, error } = await supabase.from(table).update(req.body).eq("id", req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  });

  const remove = asyncHandler(async (req, res) => {
    const { error } = await supabase.from(table).delete().eq("id", req.params.id);
    if (error) throw error;
    res.json({ success: true, message: `${table} record deleted.` });
  });

  return { list, getById, create, update, remove };
}

module.exports = { buildDirectoryController, distanceKm };
