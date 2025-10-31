app.post("/api/v1/users/:userId/car-image", async (req, res) => {
  const { userId } = req.params;
  const { marca, modelo, anio } = req.body;

  if (!marca || !modelo || !anio)
    return res.status(400).json({ error: "Faltan campos" });

  const name = `${normalizeName(marca, modelo, anio)}.png`;

  console.log(`[INFO] Iniciando proceso para userId=${userId}, carro=${marca} ${modelo} ${anio}`);

  let vehicleUser;
  try {
    const { data, error } = await supabase
      .from("vehicles_to_users")
      .select("*")
      .eq("id_auth_user", userId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Error DB al buscar usuario: ${error.message}`);
    if (!data || data.length === 0) return res.status(404).json({ error: "Registro no encontrado" });

    vehicleUser = data[0];
    console.log("[INFO] Registro del usuario encontrado");
  } catch (err) {
    console.error("[DB ERROR]", err);
    return res.status(500).json({ error: "Error en DB", detail: err.message });
  }

  // Verificar si imagen ya existe
  let imageUrl;
  try {
    const { data: list } = await supabase.storage.from("images").list();
    const fileExists = list?.find((file) => file.name === name);

    if (fileExists) {
      imageUrl = supabase.storage.from("images").getPublicUrl(name).data.publicUrl;
      console.log("[INFO] Imagen ya existe, usando URL existente");
    }
  } catch (err) {
    console.error("[STORAGE LIST ERROR]", err);
    return res.status(500).json({ error: "Error listando storage", detail: err.message });
  }

  if (!imageUrl) {
    // Generar imagen con OpenAI
    console.log("[INFO] Generando nueva imagen con OpenAI");
    try {
      const prompt = `
        Un automóvil ${marca} ${modelo} ${anio}, render 3D realista, vista 3/4 frontal.
        Fondo completamente transparente (sin sombras, sin reflejos).
        El auto debe ocupar el 95% del ancho de la imagen, proporción 16:9 (780x440 px).
      `;

      const response = await openai.images.generate({
        model: "gpt-image-1",
        prompt,
        size: "780x440",
        n: 1,
        background: "transparent",
      });

      const imageBase64 = response.data[0]?.b64_json;
      if (!imageBase64) throw new Error("OpenAI no devolvió imagen");

      const buffer = Buffer.from(imageBase64, "base64");

      const { error: uploadError } = await supabase.storage
        .from("images")
        .upload(name, buffer, { contentType: "image/png", upsert: true });

      if (uploadError) throw new Error("Error subiendo a Storage: " + uploadError.message);

      imageUrl = supabase.storage.from("images").getPublicUrl(name).data.publicUrl;
      console.log("[INFO] Imagen generada y subida correctamente");
    } catch (err) {
      console.error("[IMAGE GENERATION ERROR]", err);
      return res.status(500).json({ error: "Error generando imagen", detail: err.message });
    }
  }

  // Actualizar URL en DB
  try {
    const { error: updateError } = await supabase
      .from("vehicles_to_users")
      .update({ image_url: imageUrl })
      .eq("id", vehicleUser.id);

    if (updateError) throw new Error(updateError.message);
    console.log("[INFO] URL de imagen actualizada en DB");
  } catch (err) {
    console.error("[DB UPDATE ERROR]", err);
    return res.status(500).json({ error: "Error actualizando DB", detail: err.message });
  }

  return res.json({ status: "ready", url: imageUrl });
});
