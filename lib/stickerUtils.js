/**
 * ═══════════════════════════════════════════════════════════
 * 🎭 HANI-MD — Sticker Utils
 * ═══════════════════════════════════════════════════════════
 * Création de stickers WebP valides pour WhatsApp
 * - Image statique : sharp (pas de ffmpeg requis)
 * - Vidéo animée   : ffmpeg-static
 * ═══════════════════════════════════════════════════════════
 */

const sharp  = require('sharp');
const path   = require('path');
const fs     = require('fs');
const os     = require('os');
const { execSync, spawnSync } = require('child_process');

// ── Chemin ffmpeg ────────────────────────────────────────
let FFMPEG_BIN = null;
try {
  FFMPEG_BIN = require('ffmpeg-static');
} catch (e) {
  FFMPEG_BIN = 'ffmpeg';
}

// ── Encodage EXIF pour les métadonnées sticker WhatsApp ──
function buildExifBuffer(packName, author) {
  const json = JSON.stringify({
    'sticker-pack-id':        'com.hanimd.pack',
    'sticker-pack-name':       packName || 'HANI-MD',
    'sticker-pack-publisher':  author  || 'H2025',
    'emojis': ['🌟']
  });

  const jsonBuf   = Buffer.from(json, 'utf8');
  const exifHeader = Buffer.from([
    0x49, 0x49, 0x2A, 0x00,       // TIFF little-endian header + magic
    0x08, 0x00, 0x00, 0x00,       // Offset to first IFD
    0x01, 0x00,                   // Number of IFD entries: 1
    0x41, 0x88,                   // Tag: UserComment (0x9286)
    0x07, 0x00,                   // Type: UNDEFINED
    jsonBuf.length & 0xFF,
    (jsonBuf.length >> 8)  & 0xFF,
    (jsonBuf.length >> 16) & 0xFF,
    (jsonBuf.length >> 24) & 0xFF,
    0x1A, 0x00, 0x00, 0x00,       // Value offset
    0x00, 0x00, 0x00, 0x00        // Next IFD offset (none)
  ]);

  const exif = Buffer.concat([exifHeader, jsonBuf]);

  // Wrap in WebP EXIF chunk format: "EXIF" + size (LE 4 bytes) + data
  const exifChunkHeader = Buffer.from('EXIF');
  const exifSize = Buffer.alloc(4);
  exifSize.writeUInt32LE(exif.length, 0);
  return Buffer.concat([exifChunkHeader, exifSize, exif]);
}

// ── Injection du chunk EXIF dans un WebP RIFF ────────────
function injectExifIntoWebp(webpBuffer, packName, author) {
  try {
    const riff   = webpBuffer.slice(0, 4).toString('ascii');
    const webpId = webpBuffer.slice(8, 12).toString('ascii');
    if (riff !== 'RIFF' || webpId !== 'WEBP') {
      console.log('[STICKER] Buffer non-WebP, retour sans métadonnées');
      return webpBuffer;
    }

    const exifChunk = buildExifBuffer(packName, author);

    // Construire un nouveau RIFF avec le chunk EXIF ajouté
    const originalRiffSize = webpBuffer.readUInt32LE(4);
    const newRiffSize       = originalRiffSize + exifChunk.length;
    const newSizeBuffer     = Buffer.alloc(4);
    newSizeBuffer.writeUInt32LE(newRiffSize, 0);

    return Buffer.concat([
      webpBuffer.slice(0, 4),   // "RIFF"
      newSizeBuffer,             // nouveau size
      webpBuffer.slice(8),       // reste du fichier WebP
      exifChunk                  // chunk EXIF
    ]);
  } catch (e) {
    console.log('[STICKER] Injection EXIF ignorée:', e.message);
    return webpBuffer;
  }
}

// ── Conversion IMAGE → WebP statique ────────────────────
async function imageToStickerBuffer(inputBuffer, packName, author) {
  // 1. Convertir en WebP 512x512 transparent via sharp
  const webpBuffer = await sharp(inputBuffer)
    .resize(512, 512, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .webp({ quality: 80, lossless: false })
    .toBuffer();

  // 2. Injecter les métadonnées sticker
  return injectExifIntoWebp(webpBuffer, packName, author);
}

// ── Conversion VIDÉO → WebP animé ───────────────────────
async function videoToStickerBuffer(inputBuffer, packName, author) {
  const tmpDir  = os.tmpdir();
  const tmpIn   = path.join(tmpDir, `hani_stk_in_${Date.now()}.mp4`);
  const tmpOut  = path.join(tmpDir, `hani_stk_out_${Date.now()}.webp`);

  try {
    fs.writeFileSync(tmpIn, inputBuffer);

    const ffmpegArgs = [
      '-i', tmpIn,
      '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=black@0,fps=15',
      '-vcodec', 'libwebp',
      '-lossless', '0',
      '-compression_level', '3',
      '-q:v', '70',
      '-loop', '0',
      '-preset', 'picture',
      '-an',
      '-t', '6',     // max 6 secondes
      '-vsync', '0',
      '-y', tmpOut
    ];

    const result = spawnSync(FFMPEG_BIN, ffmpegArgs, {
      timeout: 30000,
      stdio: ['ignore', 'ignore', 'pipe']
    });

    if (result.status !== 0 || !fs.existsSync(tmpOut)) {
      throw new Error('Conversion vidéo échouée: ' + (result.stderr?.toString() || 'unknown'));
    }

    const webpBuffer = fs.readFileSync(tmpOut);
    if (!webpBuffer || webpBuffer.length < 100) {
      throw new Error('WebP animé vide après conversion');
    }

    return injectExifIntoWebp(webpBuffer, packName, author);
  } finally {
    try { if (fs.existsSync(tmpIn))  fs.unlinkSync(tmpIn);  } catch (e) {}
    try { if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut); } catch (e) {}
  }
}

// ── Fonction principale ──────────────────────────────────
async function makeSticker(buffer, isVideo = false, packName = 'HANI-MD', author = 'H2025') {
  if (!buffer || buffer.length === 0) throw new Error('Buffer vide');
  if (isVideo) {
    return videoToStickerBuffer(buffer, packName, author);
  } else {
    return imageToStickerBuffer(buffer, packName, author);
  }
}

// ── VIDÉO → AUDIO MP3 ───────────────────────────────────
async function videoToAudio(inputBuffer) {
  const tmpDir = os.tmpdir();
  const tmpIn  = path.join(tmpDir, `hani_va_in_${Date.now()}.mp4`);
  const tmpOut = path.join(tmpDir, `hani_va_out_${Date.now()}.mp3`);
  try {
    fs.writeFileSync(tmpIn, inputBuffer);
    const result = spawnSync(FFMPEG_BIN, [
      '-i', tmpIn,
      '-vn',
      '-acodec', 'libmp3lame',
      '-q:a', '2',
      '-y', tmpOut
    ], { timeout: 30000, stdio: ['ignore', 'ignore', 'pipe'] });

    if (result.status !== 0 || !fs.existsSync(tmpOut))
      throw new Error('Extraction audio échouée: ' + (result.stderr?.toString().slice(-200) || ''));

    const buf = fs.readFileSync(tmpOut);
    if (!buf || buf.length < 100) throw new Error('Audio extrait vide');
    return buf;
  } finally {
    try { if (fs.existsSync(tmpIn))  fs.unlinkSync(tmpIn);  } catch (_) {}
    try { if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut); } catch (_) {}
  }
}

// ── VIDÉO → VOCAL OGG OPUS ──────────────────────────────
async function videoToVoiceNote(inputBuffer) {
  const tmpDir = os.tmpdir();
  const tmpIn  = path.join(tmpDir, `hani_vvn_in_${Date.now()}.mp4`);
  const tmpOut = path.join(tmpDir, `hani_vvn_out_${Date.now()}.ogg`);
  try {
    fs.writeFileSync(tmpIn, inputBuffer);
    const result = spawnSync(FFMPEG_BIN, [
      '-i', tmpIn,
      '-vn',
      '-acodec', 'libopus',
      '-b:a', '128k',
      '-y', tmpOut
    ], { timeout: 30000, stdio: ['ignore', 'ignore', 'pipe'] });

    if (result.status !== 0 || !fs.existsSync(tmpOut))
      throw new Error('Conversion vocale échouée: ' + (result.stderr?.toString().slice(-200) || ''));

    const buf = fs.readFileSync(tmpOut);
    if (!buf || buf.length < 100) throw new Error('Vocal extrait vide');
    return buf;
  } finally {
    try { if (fs.existsSync(tmpIn))  fs.unlinkSync(tmpIn);  } catch (_) {}
    try { if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut); } catch (_) {}
  }
}

// ── STICKER WEBP → VIDÉO MP4 ────────────────────────────
async function stickerToVideo(inputBuffer) {
  const tmpDir = os.tmpdir();
  const tmpIn  = path.join(tmpDir, `hani_sv_in_${Date.now()}.webp`);
  const tmpOut = path.join(tmpDir, `hani_sv_out_${Date.now()}.mp4`);
  try {
    fs.writeFileSync(tmpIn, inputBuffer);
    const result = spawnSync(FFMPEG_BIN, [
      '-i', tmpIn,
      '-vf', 'scale=512:512:flags=lanczos',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      '-y', tmpOut
    ], { timeout: 30000, stdio: ['ignore', 'ignore', 'pipe'] });

    if (result.status !== 0 || !fs.existsSync(tmpOut))
      throw new Error('Conversion sticker→vidéo échouée: ' + (result.stderr?.toString().slice(-200) || ''));

    const buf = fs.readFileSync(tmpOut);
    if (!buf || buf.length < 100) throw new Error('Vidéo convertie vide');
    return buf;
  } finally {
    try { if (fs.existsSync(tmpIn))  fs.unlinkSync(tmpIn);  } catch (_) {}
    try { if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut); } catch (_) {}
  }
}

// ── STICKER WEBP → IMAGE PNG ─────────────────────────────
async function stickerToImage(inputBuffer) {
  // sharp extrait le premier frame du WebP animé ou statique → PNG
  return sharp(inputBuffer)
    .png()
    .toBuffer();
}

module.exports = {
  makeSticker,
  imageToStickerBuffer,
  videoToStickerBuffer,
  videoToAudio,
  videoToVoiceNote,
  stickerToVideo,
  stickerToImage
};
