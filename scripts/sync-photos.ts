/**
 * sync-photos.ts
 *
 * Run: npx tsx scripts/sync-photos.ts
 *
 * Scans public/photos/inspirations/, generates 400px thumbnails, uploads
 * originals + thumbs to Supabase Storage, upserts rows in inspiration_photos.
 *
 * Safe to re-run — skips files already in the DB by original_filename.
 * Add --force to re-process everything.
 */

import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import * as exifr from 'exifr'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const USER_ID = 'a2bcae76-355c-4771-949f-2a5928b056ff'
const BUCKET = 'inspiration-photos'
const PHOTOS_DIR = path.join(process.cwd(), 'public/photos/inspirations')
const FORCE = process.argv.includes('--force')

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

function parseDateFromFilename(filename: string): string | null {
  // Handles: 20040501-IMG_5063.jpg → 2004-05-01
  const match = filename.match(/^(\d{4})(\d{2})(\d{2})-/)
  if (match) return `${match[1]}-${match[2]}-${match[3]}`

  // Handles: 2018-07-23_IMG_4521.jpg
  const isoMatch = filename.match(/^(\d{4}-\d{2}-\d{2})/)
  if (isoMatch) return isoMatch[1]

  return null
}

async function extractExifDate(buffer: Buffer): Promise<string | null> {
  try {
    const exif = await exifr.parse(buffer, { pick: ['DateTimeOriginal', 'CreateDate'] })
    const dt = exif?.DateTimeOriginal ?? exif?.CreateDate
    if (dt instanceof Date && !isNaN(dt.getTime())) {
      return dt.toISOString().substring(0, 10)
    }
  } catch { /* ignore */ }
  return null
}

async function main() {
  const files = fs.readdirSync(PHOTOS_DIR)
    .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f) && f !== 'manifest.json')
    .sort()

  console.log(`Found ${files.length} photos in ${PHOTOS_DIR}`)

  // Fetch already-synced filenames
  const { data: existing } = await supabase
    .from('inspiration_photos')
    .select('original_filename')
    .eq('user_id', USER_ID)

  const synced = new Set((existing ?? []).map(r => r.original_filename))
  const toSync = FORCE ? files : files.filter(f => !synced.has(f))

  console.log(`${synced.size} already synced, ${toSync.length} to process\n`)

  let ok = 0, skipped = 0, errors = 0

  for (const filename of toSync) {
    const filepath = path.join(PHOTOS_DIR, filename)

    try {
      const buffer = fs.readFileSync(filepath)

      // Date: EXIF first, then filename
      const takenAt = (await extractExifDate(buffer)) ?? parseDateFromFilename(filename)
      if (!takenAt) {
        console.warn(`  ⚠ ${filename} — no date found, skipping`)
        skipped++
        continue
      }

      // Generate 400px thumbnail
      const thumbBuffer = await sharp(buffer)
        .resize({ width: 400, withoutEnlargement: true })
        .jpeg({ quality: 82 })
        .toBuffer()

      // Upload original
      const origPath = `originals/${filename}`
      const { error: origErr } = await supabase.storage
        .from(BUCKET)
        .upload(origPath, buffer, { contentType: 'image/jpeg', upsert: true })
      if (origErr) throw origErr

      // Upload thumbnail
      const thumbPath = `thumbnails/${filename}`
      const { error: thumbErr } = await supabase.storage
        .from(BUCKET)
        .upload(thumbPath, thumbBuffer, { contentType: 'image/jpeg', upsert: true })
      if (thumbErr) throw thumbErr

      // Upsert DB row
      const { error: dbErr } = await supabase.from('inspiration_photos').upsert(
        {
          user_id: USER_ID,
          storage_path: origPath,
          thumbnail_path: thumbPath,
          taken_at: takenAt,
          original_filename: filename,
        },
        { onConflict: 'user_id,original_filename' },
      )
      if (dbErr) throw dbErr

      console.log(`  ✓ ${filename} → ${takenAt}`)
      ok++
    } catch (err) {
      console.error(`  ✗ ${filename}:`, (err as Error).message)
      errors++
    }
  }

  console.log(`\nDone: ${ok} synced, ${skipped} skipped (no date), ${errors} errors`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
