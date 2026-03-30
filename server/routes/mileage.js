const router = require('express').Router();
const axios = require('axios');
const authenticate = require('../middleware/auth');

router.use(authenticate);

async function geocode(place) {
  if (place.trim().length < 3) throw new Error(`Location "${place}" is too short to be a valid place name`);

  const { data } = await axios.get('https://nominatim.openstreetmap.org/search', {
    params: { q: place, format: 'json', limit: 1, countrycodes: 'gb' },
    headers: { 'User-Agent': 'ExpenseFlow/1.0 (internal expense management)' },
    timeout: 10000,
  });

  if (!data.length) throw new Error(`Could not find location: "${place}"`);

  const result = data[0];
  if (parseFloat(result.importance) < 0.3) {
    throw new Error(`"${place}" doesn't appear to be a recognised UK town or city`);
  }

  return { lat: parseFloat(result.lat), lon: parseFloat(result.lon) };
}

// POST /api/mileage/calculate
router.post('/calculate', async (req, res) => {
  const { from, to } = req.body;
  if (!from || !to) return res.status(400).json({ error: 'from and to are required' });

  try {
    const [origin, destination] = await Promise.all([geocode(from), geocode(to)]);

    const { data } = await axios.get(
      `http://router.project-osrm.org/route/v1/driving/${origin.lon},${origin.lat};${destination.lon},${destination.lat}`,
      {
        params: { overview: 'false' },
        headers: { 'User-Agent': 'ExpenseFlow/1.0 (internal expense management)' },
        timeout: 15000,
      }
    );

    if (data.code !== 'Ok' || !data.routes.length) {
      return res.status(422).json({ error: 'Could not calculate route between these locations' });
    }

    const metres = data.routes[0].distance;
    const miles = Math.round((metres / 1609.344) * 10) / 10;

    res.json({ miles });
  } catch (err) {
    if (err.message.startsWith('Could not find location')) {
      return res.status(422).json({ error: err.message });
    }
    console.error('Mileage calculation error:', err.message);
    res.status(500).json({ error: 'Distance calculation failed. Please enter the distance manually.' });
  }
});

module.exports = router;
