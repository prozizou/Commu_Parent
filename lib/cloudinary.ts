/**
 * Upload d'un fichier (justificatif d'absence, bulletin scanné, photo)
 * vers Cloudinary via un unsigned upload preset côté client.
 * Créez le preset dans Cloudinary : Settings > Upload > Add upload preset (mode "Unsigned").
 */
export async function uploadToCloudinary(file: File): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error("Configuration Cloudinary manquante (cloud name / upload preset).");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);
  formData.append("folder", "commu_parent");

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    method: "POST",
    body: formData
  });

  if (!res.ok) {
    throw new Error("Échec de l'upload Cloudinary.");
  }

  const data = await res.json();
  return data.secure_url as string;
}
