// Formulario de verificación (GET, funciona sin JavaScript).
export default function FormVerificar({ codigo = "" }: { codigo?: string }) {
  return (
    <form action="/verificar-certificado" method="get" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="field">
        <label htmlFor="v-code">Código de verificación</label>
        <input className="input mono" id="v-code" name="codigo" defaultValue={codigo} placeholder="PID-XXXX-XXXX"
          autoCapitalize="characters" autoComplete="off" spellCheck={false} maxLength={20} required />
      </div>
      <button className="btn" type="submit">Verificar</button>
    </form>
  );
}
