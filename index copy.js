import express from "express";
import { createClient } from "@supabase/supabase-js";
import cors from "cors";
import OpenAI from "openai";

const app = express();
app.use(express.json());
app.use(cors());

// 🔐 Inicializar OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 🔐 Inicializar Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function normalizeName(marca, modelo, anio) {
  return `${modelo}_${marca}_${anio}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

app.post("/api/v1/users/:userId/car-image", async (req, res) => {
  try {
    const { userId } = req.params;
    const { marca, modelo, anio } = req.body;

    if (!marca || !modelo || !anio)
      return res.status(400).json({ error: "Faltan campos" });

    const name = `${normalizeName(marca, modelo, anio)}.png`;

    // 🧾 Buscar registro del usuario
    const { data: vehicleUsers, error: userError } = await supabase
      .from("vehicles_to_users")
      .select("*")
      .eq("id_auth_user", userId)
      .order("created_at", { ascending: false });

    if (userError) return res.status(500).json({ error: "Error DB" });
    if (!vehicleUsers || vehicleUsers.length === 0)
      return res.status(404).json({ error: "Registro no encontrado" });

    const vehicleUser = vehicleUsers[0];

    // 🔍 Verificar si ya existe imagen
    const { data: list } = await supabase.storage.from("images").list();
    let imageUrl;
    const fileExists = list?.find((file) => file.name === name);

    if (fileExists) {
      imageUrl = supabase.storage.from("images").getPublicUrl(name).data.publicUrl;
    } else {
      // 🧠 Prompt para DALL·E
      const prompt = `
        Un automóvil ${marca} ${modelo} ${anio}, render 3D realista, vista 3/4 frontal.
        Fondo completamente transparente (sin sombras, sin reflejos).
        El auto debe ocupar el 95% del ancho de la imagen, proporción 16:9 (780x440 px).
      `;

      // 🚀 Generar imagen con OpenAI
      const response = await openai.images.generate({
        model: "gpt-image-1",
        prompt,
        size: "780x440",
        n: 1,
        background: "transparent",
      });

      const imageBase64 = response.data[0].b64_json;

      if (!imageBase64)
        return res.status(500).json({ error: "OpenAI no devolvió imagen" });

      const buffer = Buffer.from(imageBase64, "base64");

      // 🪣 Subir imagen a Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("images")
        .upload(name, buffer, {
          contentType: "image/png",
          upsert: true,
        });

      if (uploadError)
        return res.status(500).json({ error: "Error subiendo a Storage" });

      imageUrl = supabase.storage.from("images").getPublicUrl(name).data.publicUrl;
    }

    // 🧾 Actualizar URL en DB
    const { error: updateError } = await supabase
      .from("vehicles_to_users")
      .update({ image_url: imageUrl })
      .eq("id", vehicleUser.id);

    if (updateError)
      return res.status(500).json({ error: "Error actualizando DB" });

    return res.json({ status: "ready", url: imageUrl });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Error en servidor", detail: String(err) });
  }
});

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

    if (error) return res.status(500).json({ error: "Error DB" });
    if (!vehicleUser)
      return res.status(404).json({ error: "Registro no encontrado" });

    return res.json({ url: vehicleUser.image_url || null });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Error en servidor", detail: String(err) });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 API corriendo en puerto ${PORT}`));
