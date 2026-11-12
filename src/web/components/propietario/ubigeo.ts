// Ubicaciones para los formularios. Lima Metropolitana y Callao con lista cerrada; el resto se escribe.
export const DEPARTAMENTOS = [
  "Amazonas", "Áncash", "Apurímac", "Arequipa", "Ayacucho", "Cajamarca", "Callao", "Cusco", "Huancavelica",
  "Huánuco", "Ica", "Junín", "La Libertad", "Lambayeque", "Lima", "Loreto", "Madre de Dios", "Moquegua", "Pasco",
  "Piura", "Puno", "San Martín", "Tacna", "Tumbes", "Ucayali",
];

export const PROVINCIAS: Record<string, string[]> = {
  Lima: ["Lima", "Barranca", "Cajatambo", "Canta", "Cañete", "Huaral", "Huarochirí", "Huaura", "Oyón", "Yauyos"],
  Callao: ["Callao"],
};

export const DISTRITOS: Record<string, string[]> = {
  "Lima/Lima": [
    "Ancón", "Ate", "Barranco", "Breña", "Carabayllo", "Chaclacayo", "Chorrillos", "Cieneguilla", "Comas",
    "El Agustino", "Independencia", "Jesús María", "La Molina", "La Victoria", "Lima", "Lince", "Los Olivos",
    "Lurigancho", "Lurín", "Magdalena del Mar", "Miraflores", "Pachacámac", "Pucusana", "Pueblo Libre",
    "Puente Piedra", "Punta Hermosa", "Punta Negra", "Rímac", "San Bartolo", "San Borja", "San Isidro",
    "San Juan de Lurigancho", "San Juan de Miraflores", "San Luis", "San Martín de Porres", "San Miguel",
    "Santa Anita", "Santa María del Mar", "Santa Rosa", "Santiago de Surco", "Surquillo", "Villa El Salvador",
    "Villa María del Triunfo",
  ],
  "Callao/Callao": ["Bellavista", "Callao", "Carmen de la Legua Reynoso", "La Perla", "La Punta", "Mi Perú", "Ventanilla"],
};

export const DISTRITOS_LIMA_CALLAO = [...DISTRITOS["Lima/Lima"], ...DISTRITOS["Callao/Callao"]];
