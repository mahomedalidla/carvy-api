import express from "express";
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // service_role para saltar policies
);

const app = express();
app.use(express.json());

// Variables Gemini
const GEMINI_API_URL = process.env.GEMINI_API_URL;
const GEMINI_KEY = process.env.GEMINI_KEY;

// Función para normalizar nombre de archivo
function normalizeName(marca, modelo, anio) {
  return `${modelo}_${marca}_${anio}`
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

// POST: Generar o recuperar imagen
app.post("/api/v1/users/:userId/car-image", async (req, res) => {
  try {
    const { userId } = req.params;
    const { marca, modelo, anio } = req.body;

    if (!marca || !modelo || !anio)
      return res.status(400).json({ error: "Faltan campos" });

    const name = `${normalizeName(marca, modelo, anio)}.jpg`;

    // 1️⃣ Traer el registro más reciente del usuario
    const { data: vehicleUsers, error: userError } = await supabase
      .from("vehicles_to_users")
      .select("*")
      .eq("id_auth_user", userId)
      .order("created_at", { ascending: false });

    if (userError) {
      console.error("❌ Error consultando DB:", userError);
      return res.status(500).json({ error: "Error consultando la DB" });
    }

    if (!vehicleUsers || vehicleUsers.length === 0)
      return res.status(404).json({ error: "Registro de usuario no encontrado" });

    const vehicleUser = vehicleUsers[0]; // más reciente

    // 2️⃣ Revisar Storage público
    const { data: list, error: listError } = await supabase.storage.from("images").list();

    if (listError) {
      console.error("❌ Error listando storage:", listError);
      return res.status(500).json({ error: "Error consultando storage" });
    }

    let imageUrl;
    const fileExists = list?.find(file => file.name === name);

    if (fileExists) {
      imageUrl = supabase.storage.from("images").getPublicUrl(name).publicURL;
      console.log("✅ Imagen encontrada en cache:", imageUrl);
    } else {
      // 3️⃣ Llamar a Gemini
      const prompt = `Imagen realista de un auto ${marca} ${modelo} ${anio}, vista 3/4 frontal, fondo neutro, estilo fotográfico`;
      const geminiResp = await fetch(GEMINI_API_URL, {
        method: "POST",
        headers: {
          "x-goog-api-key": GEMINI_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: { sampleCount: 1 },
        }),
      });

      const geminiJson = await geminiResp.json();
      console.log("Respuesta Gemini:", geminiJson);

      const base64 =
        geminiJson?.predictions?.[0]?.bytesBase64Encoded ||
        geminiJson?.predictions?.[0]?.image;

      if (!base64) {
        console.error("❌ Gemini no devolvió imagen válida:", geminiJson);
        return res.status(500).json({ error: "Error generando imagen en Gemini" });
      }

      // 4️⃣ Guardar en Storage
const buffer = Buffer.from(base64, "base64");
const { data: uploadData, error: uploadError } = await supabase.storage
  .from("images")
  .upload(name, buffer, {
    contentType: "image/jpeg",
    upsert: true,
  });

if (uploadError) {
  console.error("❌ Error subiendo imagen:", uploadError);
  return res.status(500).json({ error: "Error subiendo imagen a Storage" });
}

// ✅ Obtener URL pública real desde Supabase
const { data: publicData } = supabase.storage.from("images").getPublicUrl(name);
imageUrl = publicData?.publicUrl;

if (!imageUrl) {
  console.error("❌ No se pudo obtener la URL pública del archivo");
  return res.status(500).json({ error: "No se pudo obtener la URL pública" });
}

console.log("✅ Imagen subida correctamente:", imageUrl);

    }

    // 5️⃣ Guardar URL en vehicles_to_users.image_url
    const { error: updateError } = await supabase
      .from("vehicles_to_users")
      .update({ image_url: imageUrl })
      .eq("id", vehicleUser.id);

    if (updateError) {
      console.error("❌ Error actualizando registro:", updateError);
      return res.status(500).json({ error: "Error actualizando imagen en DB" });
    }

    console.log("✅ URL guardada correctamente en DB");
    return res.json({ status: "ready", url: imageUrl });

  } catch (err) {
    console.error("❌ Error en servidor:", err);
    return res.status(500).json({ error: "Error en servidor", detail: String(err) });
  }
});

// GET: Recuperar imagen
app.get("/api/v1/users/:userId/car-image", async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: vehicleUser, error } = await supabase
      .from("vehicles_to_users")
      .select("image_url")
      .eq("id_auth_user", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error("❌ Error al consultar:", error);
      return res.status(500).json({ error: "Error al consultar la DB" });
    }

    if (!vehicleUser)
      return res.status(404).json({ error: "Registro de usuario no encontrado" });

    return res.json({ url: vehicleUser.image_url || null });
  } catch (err) {
    console.error("❌ Error en servidor:", err);
    return res.status(500).json({ error: "Error en servidor", detail: String(err) });
  }
});

// Iniciar servidor
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 API corriendo en puerto ${PORT}`));
