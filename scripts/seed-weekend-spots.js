#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf-8')
env.split('\n').forEach(line => {
  const [k, ...v] = line.split('=')
  if (k && v.length) process.env[k.trim()] = v.join('=').trim()
})

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

const USER_ID = 'a2bcae76-355c-4771-949f-2a5928b056ff'

const spots = [
  // Denver / close-in
  { name: 'Wash Park',               type: 'run',    location: 'Denver',           latitude: 39.6982, longitude: -104.9734, age_min: 0, drive_minutes: 5,   notes: 'Run Club Monday evenings. 2.6mi loop, flat, social.' },
  { name: 'South Platte Trail',      type: 'run',    location: 'Denver',           latitude: 39.7150, longitude: -105.0102, age_min: 0, drive_minutes: 10,  notes: 'Paved trail, stroller-friendly, connects to Cherry Creek.' },
  { name: 'Cherry Creek State Park', type: 'bike',   location: 'Aurora',           latitude: 39.6436, longitude: -104.8511, age_min: 0, drive_minutes: 20,  notes: 'Easy paved loops, great for kids on bikes, reservoir views.' },
  { name: 'Chatfield State Park',    type: 'family', location: 'Littleton',        latitude: 39.5356, longitude: -105.0694, age_min: 0, drive_minutes: 25,  notes: 'Swimming, paddle boats, trails, massive open space. Bring the FJ.' },
  { name: 'Denver Zoo',              type: 'family', location: 'Denver',           latitude: 39.7501, longitude: -104.9519, age_min: 2, drive_minutes: 10,  notes: 'Best for Sylvia. Chase and Ada can handle a full loop.' },
  { name: 'Denver Museum of Nature', type: 'family', location: 'Denver',           latitude: 39.7478, longitude: -104.9421, age_min: 4, drive_minutes: 10,  notes: 'Gems, dinosaurs, space. All three kids love it. Bad weather default.' },
  // Front Range
  { name: 'Red Rocks Trail',         type: 'trail',  location: 'Morrison',         latitude: 39.6654, longitude: -105.2057, age_min: 5, drive_minutes: 25,  notes: 'Trading Post Trail 1.4mi loop or extend to village. Iconic.' },
  { name: 'Bear Creek Trail',        type: 'trail',  location: 'Morrison',         latitude: 39.6448, longitude: -105.1447, age_min: 4, drive_minutes: 25,  notes: 'Creekside, shaded, family-paced. Links to Lair o the Bear.' },
  { name: 'Lair o the Bear',         type: 'trail',  location: 'Morrison',         latitude: 39.6468, longitude: -105.2020, age_min: 4, drive_minutes: 35,  notes: '50 Hikes #5. Castle and beautiful creek. Easy 2mi, all three kids can do it.' },
  { name: 'Mount Falcon',            type: 'trail',  location: 'Morrison',         latitude: 39.6405, longitude: -105.2326, age_min: 6, drive_minutes: 35,  notes: '50 Hikes #7. Castle ruins + lookout tower. Chase and Ada territory.' },
  { name: 'Chautauqua Park',         type: 'trail',  location: 'Boulder',          latitude: 39.9993, longitude: -105.2809, age_min: 5, drive_minutes: 40,  notes: 'Bluebell-Baird or Royal Arch. Flatirons backdrop. Worth the drive.' },
  { name: 'Castlewood Canyon',       type: 'trail',  location: 'Franktown',        latitude: 39.3245, longitude: -104.7479, age_min: 5, drive_minutes: 45,  notes: '50 Hikes #47. Inner canyon loop 2mi. Creek, canyon walls, cool rocks.' },
  // Howard / BV area
  { name: 'Howard / Arkansas River', type: 'run',    location: 'Howard, CO',       latitude: 38.4339, longitude: -105.8295, age_min: 5, drive_minutes: 120, notes: 'WLW race-specific trail training. 20min from Buena Vista. The ranch.' },
  { name: 'Mount Princeton Hot Springs', type: 'family', location: 'Nathrop, CO', latitude: 38.7200, longitude: -106.1750, age_min: 5, drive_minutes: 125, notes: 'Outdoor hot springs, creek pools. Pairs with Howard run weekend.' },
]

async function seed() {
  const rows = spots.map(s => ({ ...s, user_id: USER_ID }))
  const { error, count } = await supabase
    .from('weekend_spots')
    .insert(rows)
    .select('id', { count: 'exact', head: true })

  if (error) { console.error('Error:', error.message); process.exit(1) }
  console.log(`Seeded ${rows.length} weekend spots (${count ?? '?'} affected)`)
}

seed()
