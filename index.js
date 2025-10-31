import express from "express";
import { createClient } from "@supabase/supabase-js";
import cors from "cors";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);

const app = express();
app.use(express.json());
app.use(cors()); // ⚡ permite llamadas desde cualquier origen (ajusta en producción)

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

    const { data: vehicleUsers, error: userError } = await supabase
      .from("vehicles_to_users")
      .select("*")
      .eq("id_auth_user", userId)
      .order("created_at", { ascending: false });

    if (userError) return res.status(500).json({ error: "Error DB" });
    if (!vehicleUsers || vehicleUsers.length === 0)
      return res.status(404).json({ error: "Registro no encontrado" });

    const vehicleUser = vehicleUsers[0];

    const { data: list } = await supabase.storage.from("images").list();
    let imageUrl;

    const fileExists = list?.find((file) => file.name === name);
    if (fileExists) {
      imageUrl = supabase.storage.from("images").getPublicUrl(name).data.publicUrl;
    } else {
      // 🧠 Prompt para Gemini
      const prompt = `Genera una imagen de un auto ${marca} ${modelo} ${anio}, vista 3/4 frontal, con el estilo render 3D del auto en color blanco, con fondo **transparente** (png), sin reflejos en el suelo, asegúrate de que los rines son los originales que trae el auto de agencia. 
La perspectiva de la foto debe ser a 30 cm desde el suelo y que se vea el frente completo del auto.
El auto debe de abarcar el 95% del ancho de la imagen, y la resolución de la imagen debe ser de 780x440 px.`;

      // 🚀 Generar imagen con Gemini SDK
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image" });
      const response = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          imageConfig: {
            aspectRatio: "16:9",
            mimeType: "image/png",
          },
        },
      });

      // 🔍 Extraer imagen (base64)
      const imageBase64 =
        response?.response?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (!imageBase64)
        return res.status(500).json({ error: "Gemini no devolvió imagen" });

      const buffer = Buffer.from(imageBase64, "base64");

      // 🪣 Subir a Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("images")
        .upload(name, buffer, {
          contentType: "image/png",
          upsert: true,
        });

      if (uploadError)
        return res.status(500).json({ error: "Error subiendo a Storage" });

      imageUrl = supabase.storage.from("images").getPublicUrl(name).data.publicUrl;
      if (!imageUrl)
        return res.status(500).json({ error: "No se pudo obtener URL pública" });
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
