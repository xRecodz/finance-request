/**
 * Ekstrak NIP (+ nama ringkas) dari dump SQL HRIS ke prisma/data/hris-employees.json
 * Usage: npx tsx scripts/extract-hris-nip.ts [/path/to/hris.sql]
 */
import fs from "fs";
import path from "path";

const dumpPath = process.argv[2] || "/home/loc/dumps/hris.sql";
const outPath = path.resolve(__dirname, "../prisma/data/hris-employees.json");

const cols = [
  "id",
  "nip",
  "legacy_kode_kry",
  "nik",
  "bpjs_kesehatan",
  "bpjs_ketenagakerjaan",
  "user_id",
  "name",
  "mother_name",
  "bank_account_number",
  "bank_name",
  "account_holder_name",
  "email",
  "birthplace",
  "birthdate",
  "gender",
  "marital_status",
  "nationality",
  "phone",
  "address",
  "position",
  "division",
  "business_segment",
  "hire_date",
  "is_active",
  "resign_date",
  "include_in_payroll",
  "created_at",
  "updated_at",
  "clean_position",
];

function parseValuesBlob(blob: string) {
  const rows: Record<string, string | null>[] = [];
  let i = 0;
  const n = blob.length;
  while (i < n) {
    if (blob[i] !== "(") {
      i += 1;
      continue;
    }
    i += 1;
    const fields: string[] = [];
    let cur = "";
    let inStr = false;
    let esc = false;
    while (i < n) {
      const ch = blob[i];
      if (inStr) {
        if (esc) {
          cur += ch;
          esc = false;
        } else if (ch === "\\") {
          cur += ch;
          esc = true;
        } else if (ch === "'") {
          inStr = false;
          cur += ch;
        } else {
          cur += ch;
        }
        i += 1;
        continue;
      }
      if (ch === "'") {
        inStr = true;
        cur += ch;
        i += 1;
        continue;
      }
      if (ch === ",") {
        fields.push(cur.trim());
        cur = "";
        i += 1;
        continue;
      }
      if (ch === ")") {
        fields.push(cur.trim());
        i += 1;
        break;
      }
      cur += ch;
      i += 1;
    }

    const unq = (x: string) => {
      if (x === "NULL") return null;
      if (x.length >= 2 && x[0] === "'" && x[x.length - 1] === "'") {
        return x.slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, "\\");
      }
      return x;
    };

    const mapped: Record<string, string | null> = {};
    for (let j = 0; j < cols.length; j += 1) {
      mapped[cols[j]] = j < fields.length ? unq(fields[j]) : null;
    }
    rows.push(mapped);
  }
  return rows;
}

if (!fs.existsSync(dumpPath)) {
  console.error(`Dump tidak ditemukan: ${dumpPath}`);
  process.exit(1);
}

const rows: Record<string, string | null>[] = [];
const stream = fs.readFileSync(dumpPath, "utf8").split("\n");
for (const line of stream) {
  if (line.startsWith("INSERT INTO `employees` VALUES")) {
    const blob = line.slice("INSERT INTO `employees` VALUES ".length).replace(/;\s*$/, "");
    rows.push(...parseValuesBlob(blob));
  }
}

const seen = new Set<string>();
const out = [];
for (const r of rows) {
  const nip = (r.nip || "").trim();
  const name = (r.name || "").trim();
  if (!nip || !name || seen.has(nip)) continue;
  seen.add(nip);
  out.push({
    nip,
    name,
    email: r.email,
    phone: r.phone,
    position: r.position || r.clean_position,
    department: r.division,
    isActive: String(r.is_active) === "1",
  });
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(out));
console.log(`OK: ${out.length} NIP → ${outPath}`);
console.log(`Aktif: ${out.filter((x) => x.isActive).length}`);
