// Crea (o cambia) la clave del panel de una web de cliente y la muestra para pasársela.
// Uso en el servidor:  node /var/www/dmith-app/sitios-servidor/web-clave.js serenidad
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const slug = String(process.argv[2] || "");
if (!/^[a-z0-9-]{2,40}$/.test(slug)) { console.log("Uso: node web-clave.js <nombre-de-la-web>   (ej: serenidad)"); process.exit(1); }
const DIR = process.env.SITIOS_DIR || "/root/sitios-datos", f = path.join(DIR, "webs", slug, "acceso.json");
const letras = "abcdefghjkmnpqrstuvwxyz23456789";
const clave = Array.from(crypto.randomBytes(10), (b) => letras[b % letras.length]).join("").replace(/(.{5})/, "$1-");
const sal = crypto.randomBytes(12).toString("hex");
fs.mkdirSync(path.dirname(f), { recursive: true });
fs.writeFileSync(f, JSON.stringify({ sal, hash: crypto.createHash("sha256").update(sal + clave).digest("hex"), sesiones: [], creada: new Date().toISOString() }, null, 1));
fs.chmodSync(f, 0o600);
console.log("\nPanel: https://dmith.app/" + slug + "/panel/\nClave: " + clave + "\n\n(Si ya tenía una clave, la vieja dejó de funcionar y se cerraron sus sesiones.)\n");
