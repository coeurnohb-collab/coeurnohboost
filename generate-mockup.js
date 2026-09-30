// api/generate-mockup.js
// Genere un VRAI mockup photoréaliste avec une IA de génération d'image
// (Google Gemini / "Nano Banana") au lieu d'un simple montage en canvas :
// le design est appliqué au produit avec les bonnes ombres, plis et
// perspective, comme s'il avait été imprimé/brodé directement dessus.
//
// Nécessite la variable d'environnement Vercel : GEMINI_API_KEY
// (à récupérer gratuitement sur https://aistudio.google.com/apikey).
// Facturation à l'usage chez Google, pas chez Coeurnoh Universe : environ
// 0,04 $ par image générée au tarif actuel de Gemini 2.5 Flash Image.
//
// GEMINI_IMAGE_MODEL (optionnel) : nom du modèle à utiliser. Par défaut
// "gemini-2.5-flash-image" (version stable). Si Google publie un modèle
// plus récent/moins cher, change juste cette variable d'environnement --
// aucune modification de code nécessaire.

const { verifyCaller, enforceRateLimit, sendError, HttpError, UserError, getBody } = require('./_lib/security');

const DEFAULT_MODEL = 'gemini-2.5-flash-image';
const MAX_INPUT_B64_CHARS = 6_000_000; // ~4.5 Mo par image une fois décodée

function parseDataUrl(value) {
  if (typeof value !== 'string' || !value) return null;
  const m = /^data:([^;]+);base64,(.+)$/.exec(value);
  if (!m) return null;
  if (m[2].length > MAX_INPUT_B64_CHARS) return null;
  return { mimeType: m[1], data: m[2] };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Méthode non autorisée.' });

  try {
    const caller = await verifyCaller(req);
    // Cette fonctionnalité a un vrai coût (facturé par Google à chaque
    // appel) : on limite chaque utilisateur pour éviter qu'un abus ne
    // fasse exploser la facture. Ajuste ces chiffres si besoin.
    await enforceRateLimit({ scope: 'generate_mockup', id: caller.uid, limit: 8, windowSec: 3600 });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new UserError("La génération IA n'est pas encore activée sur ce serveur (clé GEMINI_API_KEY manquante). Contacte l'administrateur.");
    }

    const body = getBody(req);
    const base = parseDataUrl(body.baseImage);
    const design = parseDataUrl(body.designImage);
    if (!base || !design) {
      throw new UserError('Photo du produit ou design manquant ou trop volumineux (réduis la taille des images et réessaie).');
    }
    const placementHint = typeof body.placementHint === 'string' ? body.placementHint.slice(0, 200) : '';

    const model = process.env.GEMINI_IMAGE_MODEL || DEFAULT_MODEL;
    const prompt =
      "You are a professional product photographer and mockup compositor. " +
      "The FIRST image is a blank product photo (packaging, apparel, bag...). " +
      "The SECOND image is a design/logo/artwork to apply onto that product. " +
      "Composite the second image onto the product from the first image as if it had been printed, embroidered or engraved there originally at the factory — matching the product's exact lighting, shadows, fabric folds, surface curvature, perspective and color grading. " +
      (placementHint ? `Placement instructions: ${placementHint}. ` : '') +
      "Keep everything else in the original photo unchanged. Do not add any watermark, text, or logo that wasn't in the design. " +
      "Output one single photorealistic, high-resolution product photography image.";

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`;
    const geminiRes = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inlineData: { mimeType: base.mimeType, data: base.data } },
            { inlineData: { mimeType: design.mimeType, data: design.data } }
          ]
        }],
        generationConfig: { responseModalities: ['IMAGE'] }
      })
    });

    const data = await geminiRes.json();
    if (!geminiRes.ok) {
      const msg = (data && data.error && data.error.message) || `Erreur Gemini (${geminiRes.status})`;
      throw new UserError(`Génération impossible : ${msg}`);
    }

    const parts = (((data.candidates || [])[0] || {}).content || {}).parts || [];
    const imagePart = parts.find((p) => p.inlineData && p.inlineData.data);
    if (!imagePart) {
      throw new UserError("L'IA n'a pas renvoyé d'image. Réessaie, ou change légèrement le design/la photo.");
    }

    return res.status(200).json({
      success: true,
      imageDataUrl: `data:${imagePart.inlineData.mimeType || 'image/png'};base64,${imagePart.inlineData.data}`
    });
  } catch (err) {
    return sendError(res, err, 'generate-mockup');
  }
};
