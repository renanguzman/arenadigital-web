#!/usr/bin/env node

/**
 * Renderiza os templates HTML e aplica no Supabase via CLI (config push).
 *
 * Pré-requisito: Supabase CLI autenticado (`supabase login`)
 *
 * Uso:
 *   pnpm email-templates:apply
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { spawnSync } from "node:child_process"

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF ?? "vsehlxyowqqhakbjiznv"

const TEMPLATES = [
  ["confirmation.html", "confirmation.body.html"],
  ["magic-link.html", "magic-link.body.html"],
  ["recovery.html", "recovery.body.html"],
  ["invite.html", "invite.body.html"],
  ["email-change.html", "email-change.body.html"],
  ["reauthentication.html", "reauthentication.body.html"],
]

function renderTemplates() {
  const shell = readFileSync(join(__dirname, "_shell.html"), "utf8")
  const outDir = join(__dirname, "rendered")
  mkdirSync(outDir, { recursive: true })

  for (const [outName, bodyName] of TEMPLATES) {
    const body = readFileSync(join(__dirname, bodyName), "utf8")
    writeFileSync(join(outDir, outName), shell.replace("{{CONTENT}}", body.trim()))
  }

  console.log(`Renderizados ${TEMPLATES.length} templates em supabase/email-templates/rendered/`)
}

function applyViaCli() {
  console.log(`Aplicando config (auth + templates) no projeto ${PROJECT_REF}...`)

  const result = spawnSync(
    "supabase",
    ["config", "push", "--project-ref", PROJECT_REF, "--yes"],
    { stdio: "inherit", cwd: join(__dirname, "../..") },
  )

  if (result.status !== 0) {
    console.error("\nFalha ao aplicar. Verifique se o Supabase CLI está autenticado:")
    console.error("  supabase login")
    process.exit(result.status ?? 1)
  }

  console.log("\nTemplates aplicados com sucesso.")
  console.log("Confira em: Authentication → Email Templates")
}

renderTemplates()
applyViaCli()
