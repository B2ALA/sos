/* ══════════════════════════════════════════════════════════════
   categories.js
   Single source of truth for every category the map understands:
   - which OpenStreetMap tags to query via Overpass
   - what color/icon to show on the map and in the card list
   Keeping this in one file means adding a new category later is a
   one-place edit (add an entry here) rather than hunting through
   map-app.js.
   ══════════════════════════════════════════════════════════════ */

// Each category maps to one or more OSM tag filters. Overpass QL filters
// look like ["key"="value"] — see overpass.js for how these get combined
// into the final query string.
const CATEGORIES = {
  hospital: {
    label: 'Hospitals',
    icon: '🏥',
    color: '#D92D20',      // red
    tint: '#FEF3F2',
    osmFilters: ['["amenity"="hospital"]'],
  },
  pharmacy: {
    label: 'Pharmacies',
    icon: '💊',
    color: '#12A187',      // green
    tint: '#E8F7F2',
    osmFilters: ['["amenity"="pharmacy"]'],
  },
  clinic: {
    label: 'Clinics',
    icon: '🩺',
    color: '#7A5AF8',      // purple
    tint: '#F4F3FF',
    osmFilters: ['["amenity"="clinic"]', '["healthcare"="clinic"]'],
  },
  police: {
    label: 'Police',
    icon: '👮',
    color: '#1570EF',      // blue
    tint: '#EFF8FF',
    osmFilters: ['["amenity"="police"]'],
  },
  fire_station: {
    label: 'Fire Station',
    icon: '🚒',
    color: '#F79009',      // orange
    tint: '#FFFAEB',
    osmFilters: ['["amenity"="fire_station"]'],
  },
  blood_bank: {
    label: 'Blood Bank',
    icon: '🩸',
    color: '#B42318',      // dark red
    tint: '#FEF3F2',
    // OSM has no single universal blood-bank tag — these two cover most
    // real-world mapping conventions for blood donation centres.
    osmFilters: ['["healthcare"="blood_donation"]', '["amenity"="blood_bank"]'],
  },
  ambulance: {
    label: 'Ambulance',
    icon: '🚑',
    color: '#F79009',      // amber
    tint: '#FFFAEB',
    osmFilters: ['["emergency"="ambulance_station"]'],
  },
};

// Order in which filter chips and results should be considered (stable UI)
const CATEGORY_ORDER = ['hospital', 'pharmacy', 'clinic', 'blood_bank', 'ambulance', 'police', 'fire_station'];
