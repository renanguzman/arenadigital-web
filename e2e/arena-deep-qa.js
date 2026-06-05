const fs = require("node:fs")
const path = require("node:path")
const { chromium } = require("@playwright/test")
const { createClient } = require("@supabase/supabase-js")

const BASE_URL = process.env.QA_BASE_URL || "http://localhost:3000"
const QA_EMAIL = process.env.QA_EMAIL || "andersoaresmartins@gmail.com"
const ARENA_ID = process.env.QA_ARENA_ID || "766494ff-d225-4b19-8ebb-66abc615af61"
const RUN_ID = process.env.QA_RUN_ID || new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 12)
const QA_PREFIX = `QA-${RUN_ID}`
const RESULTS_DIR = path.join(process.cwd(), "e2e", "qa-results", QA_PREFIX)
const HEADLESS = process.env.QA_HEADLESS !== "false"
const SLOW_MO = Number(process.env.QA_SLOW_MO || 0)
const CLEANUP_QA_SPACES = process.env.QA_CLEANUP_SPACES === "true"

function loadEnv() {
  const raw = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8")
  return Object.fromEntries(
    raw
      .split(/\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=")
        return [line.slice(0, index), line.slice(index + 1).replace(/^['"]|['"]$/g, "")]
      })
  )
}

const env = loadEnv()
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const state = {
  arenaId: ARENA_ID,
  arenaName: "Arena Beach Flex",
  sport: null,
  stationType: null,
  paymentMethod: null,
  courtId: null,
  athleteId: null,
  stationId: null,
  productId: null,
  serviceId: null,
  rotativoId: null,
  rotativoCreditId: null,
  bookingId: null,
  orderId: null,
  stationPaymentId: null,
  financeInId: null,
  financeOutId: null,
  financeDeleteId: null,
  userId: null,
  arenaUserId: null,
  deleteSpaceId: null,
  deleteProductId: null,
  deleteServiceId: null,
}

const data = {
  spaceName: `${QA_PREFIX} Espaço Completo`,
  spaceEditName: `${QA_PREFIX} Espaço Editado`,
  spaceDeleteName: `${QA_PREFIX} Espaço Excluir`,
  athleteName: `${QA_PREFIX} Atleta Fluxo`,
  athleteCpf: generateCpf(RUN_ID),
  athleteEmail: `${QA_PREFIX.toLowerCase()}@example.com`,
  stationName: `${QA_PREFIX} Estação Bar`,
  stationEditName: `${QA_PREFIX} Estação Editada`,
  productName: `${QA_PREFIX} Água Teste`,
  productEditName: `${QA_PREFIX} Água Editada`,
  productDeleteName: `${QA_PREFIX} Produto Excluir`,
  serviceName: `${QA_PREFIX} Aluguel Raquete`,
  serviceEditName: `${QA_PREFIX} Serviço Editado`,
  serviceDeleteName: `${QA_PREFIX} Serviço Excluir`,
  rotativoDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
  financeIn: `${QA_PREFIX} Entrada Avulsa`,
  financeOut: `${QA_PREFIX} Saída Avulsa`,
  financeDelete: `${QA_PREFIX} Saída Excluir`,
  userName: `${QA_PREFIX} Usuário Caixa`,
  userEmail: `${QA_PREFIX.toLowerCase()}-user@example.com`,
  currencyName: `${QA_PREFIX} Coins`,
}

const results = []
const consoleIssues = []

function onlyDigits(value) {
  return String(value).replace(/\D/g, "")
}

function generateCpf(seed) {
  const base = `${onlyDigits(seed)}${Date.now()}`.slice(-9)
  const digits = base.padStart(9, "123456789").slice(0, 9).split("").map(Number)
  const calc = (length) => {
    const sum = digits.slice(0, length).reduce((acc, digit, index) => acc + digit * (length + 1 - index), 0)
    const rest = (sum * 10) % 11
    return rest === 10 ? 0 : rest
  }
  digits.push(calc(9))
  digits.push(calc(10))
  return digits.join("")
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function slug(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 80)
}

async function screenshot(page, name) {
  const file = path.join(RESULTS_DIR, `${String(results.length + 1).padStart(2, "0")}-${slug(name)}.png`)
  await page.screenshot({ path: file, fullPage: true })
  return file
}

async function step(page, name, fn) {
  const startedAt = Date.now()
  try {
    await fn()
    const image = await screenshot(page, name)
    results.push({ name, status: "passed", durationMs: Date.now() - startedAt, screenshot: image })
    console.log(`PASS ${name}`)
  } catch (error) {
    const image = await screenshot(page, `${name}-failed`).catch(() => null)
    results.push({
      name,
      status: "failed",
      durationMs: Date.now() - startedAt,
      error: error?.stack || error?.message || String(error),
      screenshot: image,
      url: page.url(),
    })
    console.log(`FAIL ${name}: ${error?.message || error}`)
  }
}

async function optionalStep(page, name, fn) {
  try {
    await step(page, name, fn)
  } catch {
    // step already records failures; this guard keeps the runner alive.
  }
}

async function generateMagicCallbackUrl() {
  const { data: linkData, error } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: QA_EMAIL,
    options: {
      redirectTo: `${BASE_URL}/auth/callback?next=/dashboard`,
    },
  })
  if (error) throw error
  return `${BASE_URL}/auth/callback?token_hash=${encodeURIComponent(
    linkData.properties.hashed_token
  )}&type=magiclink&next=/dashboard`
}

async function loadReferenceData() {
  const [{ data: arena }, { data: sports }, { data: stationTypes }, { data: methods }] = await Promise.all([
    supabase.from("arenas").select("id,name").eq("id", ARENA_ID).maybeSingle(),
    supabase.from("sports").select("id,name").order("name").limit(10),
    supabase.from("station_types").select("id,name").order("name").limit(10),
    supabase.from("modo_pagamento").select("id,nome").order("nome").limit(10),
  ])

  state.arenaName = arena?.name || state.arenaName
  state.sport = sports?.[0] || null
  state.stationType = stationTypes?.[0] || null
  state.paymentMethod = methods?.[0] || null
}

async function gotoApp(page, pathname) {
  await page.goto(`${BASE_URL}${pathname}`, { waitUntil: "domcontentloaded" })
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => null)
  await dismissOverlays(page)
  await assertHealthyPage(page)
}

async function dismissOverlays(page) {
  await page.keyboard.press("Escape").catch(() => null)
  const closeButtons = [
    page.getByRole("button", { name: "Fechar" }),
    page.getByRole("button", { name: "Agora não" }),
    page.getByRole("button", { name: "Pular" }),
  ]
  for (const button of closeButtons) {
    if (await button.first().isVisible().catch(() => false)) {
      await button.first().click().catch(() => null)
      await page.waitForTimeout(300)
    }
  }
}

async function assertHealthyPage(page) {
  const badTexts = ["Algo deu errado", "Erro ao carregar", "Application error"]
  for (const text of badTexts) {
    const locator = page.getByText(text, { exact: false })
    if (await locator.first().isVisible().catch(() => false)) {
      throw new Error(`Tela exibiu estado de erro: ${text}`)
    }
  }
}

async function clickButton(page, name) {
  const button = page.getByRole("button", { name, exact: true })
  await button.first().click({ timeout: 10000 })
  await page.waitForTimeout(300)
}

async function fillByPlaceholder(page, placeholder, value) {
  const input = page.getByPlaceholder(placeholder, { exact: true })
  await input.first().fill(String(value), { timeout: 10000 })
}

async function fillByLabel(page, label, value) {
  const input = page.getByLabel(label, { exact: true })
  await input.first().fill(String(value), { timeout: 10000 })
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

async function visibleFirst(locator) {
  const count = await locator.count().catch(() => 0)
  for (let i = 0; i < count; i += 1) {
    const item = locator.nth(i)
    if (await item.isVisible().catch(() => false)) return item
  }
  return locator.first()
}

async function selectOption(page, optionText) {
  const option = page.getByRole("option", {
    name: new RegExp(`^\\s*${escapeRegex(optionText)}\\s*$`, "i"),
  })
  await option.first().click({ timeout: 10000 })
  await page.waitForTimeout(250)
}

async function openSelectByVisibleText(page, visibleTriggerText) {
  const byRole = page.getByRole("combobox").filter({ hasText: visibleTriggerText })
  if ((await byRole.count()) > 0 && (await byRole.first().isVisible().catch(() => false))) {
    await byRole.first().click({ timeout: 10000 })
    return
  }

  const text = page.getByText(visibleTriggerText, { exact: false })
  const visibleText = await visibleFirst(text)
  const ancestor = visibleText.locator('xpath=ancestor::*[@role="combobox"][1]')
  if ((await ancestor.count().catch(() => 0)) > 0) {
    await ancestor.first().click({ timeout: 10000 })
    return
  }
  await visibleText.click({ timeout: 10000 })
}

async function chooseOptionByText(page, visibleTriggerText, optionText) {
  await openSelectByVisibleText(page, visibleTriggerText)
  await selectOption(page, optionText)
}

async function chooseFirstOptionFromTrigger(page, triggerText) {
  await openSelectByVisibleText(page, triggerText)
  await page.locator('[role="option"]').first().click({ timeout: 10000 })
  await page.waitForTimeout(250)
}

async function chooseDialogCombobox(page, index, optionText) {
  const dialog = page.locator('[role="dialog"]').last()
  const trigger = dialog.getByRole("combobox").nth(index)
  await trigger.click({ timeout: 10000 })
  await selectOption(page, optionText)
}

async function chooseFirstDialogCombobox(page, index) {
  const dialog = page.locator('[role="dialog"]').last()
  await dialog.getByRole("combobox").nth(index).click({ timeout: 10000 })
  await page.locator('[role="option"]').first().click({ timeout: 10000 })
  await page.waitForTimeout(250)
}

async function submitDialogButton(page, name) {
  const dialog = page.locator('[role="dialog"]').last()
  const button = dialog.getByRole("button", { name, exact: true }).last()
  try {
    await button.click({ timeout: 10000 })
  } catch (error) {
    await button.click({ force: true, timeout: 3000 }).catch(() => {
      throw error
    })
  }
  await page.waitForTimeout(500)
}

async function clickFirstText(page, text) {
  await page.getByText(text, { exact: true }).first().click({ timeout: 10000 })
  await page.waitForTimeout(300)
}

async function dbFindOne(table, filters, orderColumn = "created_at") {
  let query = supabase.from(table).select("*")
  for (const [key, value] of Object.entries(filters)) query = query.eq(key, value)
  if (orderColumn) query = query.order(orderColumn, { ascending: false })
  const { data: rows, error } = await query.limit(1)
  if (error) throw error
  return rows?.[0] || null
}

async function waitForDbOne(table, filters, orderColumn = "created_at", timeoutMs = 8000) {
  const started = Date.now()
  let lastError = null
  while (Date.now() - started < timeoutMs) {
    try {
      const row = await dbFindOne(table, filters, orderColumn)
      if (row) return row
    } catch (error) {
      lastError = error
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  if (lastError) throw lastError
  return null
}

async function waitForDbGone(table, filters, timeoutMs = 8000) {
  const started = Date.now()
  let lastError = null
  while (Date.now() - started < timeoutMs) {
    try {
      const row = await dbFindOne(table, filters, null)
      if (!row) return true
    } catch (error) {
      lastError = error
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  if (lastError) throw lastError
  return false
}

async function waitForVisibleText(page, text, { exact = false, timeoutMs = 8000 } = {}) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    const locator = page.getByText(text, { exact })
    const count = await locator.count().catch(() => 0)
    for (let i = 0; i < count; i += 1) {
      const item = locator.nth(i)
      if (await item.isVisible().catch(() => false)) return item
    }
    await page.waitForTimeout(300)
  }
  throw new Error(`Texto não apareceu na tela: ${text}`)
}

async function clickVisibleText(page, text, { exact = true, timeoutMs = 8000 } = {}) {
  const item = await waitForVisibleText(page, text, { exact, timeoutMs })
  await item.click({ timeout: timeoutMs })
  await page.waitForTimeout(300)
}

async function waitForVisibleTextAcrossPages(page, text, { exact = false, maxPages = 5 } = {}) {
  for (let pageIndex = 0; pageIndex < maxPages; pageIndex += 1) {
    try {
      return await waitForVisibleText(page, text, { exact, timeoutMs: 2500 })
    } catch {
      const next = page.locator("button").filter({ has: page.locator("svg.lucide-chevron-right") }).last()
      if (!(await next.isVisible().catch(() => false)) || (await next.isDisabled().catch(() => true))) break
      await next.click({ timeout: 5000 })
      await page.waitForTimeout(700)
    }
  }
  throw new Error(`Texto não apareceu no relatório/paginação: ${text}`)
}

function formatCpfBR(cpf) {
  const digits = onlyDigits(cpf)
  if (digits.length !== 11) return cpf
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

async function deleteByIds(table, column, ids) {
  const uniqueIds = [...new Set((ids ?? []).filter(Boolean))]
  if (uniqueIds.length === 0) return 0
  const { error } = await supabase.from(table).delete().in(column, uniqueIds)
  if (error) throw new Error(`Erro ao limpar ${table}: ${error.message}`)
  return uniqueIds.length
}

async function cleanupQASpaces() {
  const { data: qaCourts, error } = await supabase
    .from("courts")
    .select("id,name")
    .eq("arena_id", ARENA_ID)
    .like("name", "QA-%")

  if (error) throw error
  const courtIds = (qaCourts ?? []).map((court) => court.id)
  if (courtIds.length === 0) {
    console.log("CLEANUP nenhum espaço QA antigo encontrado")
    return
  }

  const [{ data: bookings }, { data: rotativoLinks }] = await Promise.all([
    supabase.from("bookings").select("id").in("court_id", courtIds),
    supabase.from("rotativo_courts").select("rotativo_id").in("court_id", courtIds),
  ])

  const bookingIds = (bookings ?? []).map((booking) => booking.id)
  const rotativoIds = (rotativoLinks ?? []).map((link) => link.rotativo_id)

  await deleteByIds("booking_services", "booking_id", bookingIds)
  await deleteByIds("booking_participants", "booking_id", bookingIds)
  await deleteByIds("bookings", "id", bookingIds)
  await deleteByIds("planos_mensalista", "court_id", courtIds)
  await deleteByIds("rotativo_inscricoes", "id_rotativo", rotativoIds)
  await deleteByIds("rotativo_courts", "court_id", courtIds)
  await deleteByIds("rotativos", "id", rotativoIds)
  await deleteByIds("court_sports", "court_id", courtIds)
  await deleteByIds("courts", "id", courtIds)

  console.log(`CLEANUP removidos ${courtIds.length} espaço(s) QA antigo(s)`)
}

async function createSpaceWithName(page, name) {
  await gotoApp(page, `/dashboard/arenas/${ARENA_ID}/spaces/new`)
  await fillByPlaceholder(page, "Informe o nome do espaço", name)
  await fillByPlaceholder(page, "Ex: 4", "4")
  if (state.sport) {
    const sportLabel = page.getByText(state.sport.name, { exact: true }).first()
    if (await sportLabel.isVisible().catch(() => false)) await sportLabel.click()
  }
  for (const day of ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"]) {
    const checkbox = page.locator(`[id="enable-${day}"]`).first()
    if ((await checkbox.count()) > 0) {
      const checked = await checkbox.getAttribute("aria-checked").catch(() => null)
      if (checked !== "true") await checkbox.click()
    }
  }
  const shift = page.locator('[id="shift-Segunda-feira"]').first()
  if ((await shift.count()) > 0) {
    const checked = await shift.getAttribute("aria-checked").catch(() => null)
    if (checked !== "true") await shift.click()
  }
  await fillByPlaceholder(page, "Insira aqui informações importantes que o usuário deve conhecer antes de reservar", `${name} observação`)
  await clickButton(page, "Cadastrar Espaço")
  await page.waitForURL(`**/dashboard/arenas/${ARENA_ID}**`, { timeout: 20000 }).catch(() => null)
  const court = await dbFindOne("courts", { arena_id: ARENA_ID, name })
  if (!court) throw new Error("Espaço não persistiu no banco")
  return court
}

async function createSpaceFlow(page) {
  const court = await createSpaceWithName(page, data.spaceName)
  state.courtId = court.id
}

async function editSpaceFlow(page) {
  if (!state.courtId) throw new Error("Sem courtId para editar espaço")
  await gotoApp(page, `/dashboard/arenas/${ARENA_ID}/spaces/${state.courtId}/edit`)
  await fillByPlaceholder(page, "Informe o nome do espaço", data.spaceEditName)
  await clickButton(page, "Salvar Alterações")
  await page.waitForURL(`**/dashboard/arenas/${ARENA_ID}**`, { timeout: 20000 }).catch(() => null)
  const court = await dbFindOne("courts", { arena_id: ARENA_ID, id: state.courtId })
  if (court?.name !== data.spaceEditName) throw new Error("Edição de espaço não persistiu")
}

async function openSpaceMenu(page, spaceName) {
  await waitForVisibleText(page, spaceName, { exact: true })
  const card = page
    .getByText(spaceName, { exact: true })
    .first()
    .locator('xpath=ancestor::*[.//button[@aria-label="Menu do espaço"]][1]')
  await card.getByLabel("Menu do espaço").click({ timeout: 10000 })
  await page.waitForTimeout(300)
}

async function spaceExploreFlow(page) {
  if (!state.courtId) throw new Error("Sem espaço para explorar")
  await gotoApp(page, `/dashboard/arenas/${ARENA_ID}`)
  await openSpaceMenu(page, data.spaceEditName)
  await clickVisibleText(page, "Ver detalhes")
  await waitForVisibleText(page, data.spaceEditName, { exact: true })
  await submitDialogButton(page, "Fechar")

  await page.getByLabel(`Abrir calendário do espaço ${data.spaceEditName}`).click({ timeout: 10000 })
  await page.waitForURL(`**/dashboard/arenas/${ARENA_ID}/courts/${state.courtId}/calendar**`, { timeout: 20000 })
  await waitForVisibleText(page, "Cadastrar reserva", { exact: true })
}

async function createAndDeleteSpaceFlow(page) {
  const court = await createSpaceWithName(page, data.spaceDeleteName)
  state.deleteSpaceId = court.id
  await gotoApp(page, `/dashboard/arenas/${ARENA_ID}`)
  await openSpaceMenu(page, data.spaceDeleteName)
  await clickVisibleText(page, "Excluir")
  await submitDialogButton(page, "Excluir")
  const deleted = await waitForDbGone("courts", { id: state.deleteSpaceId }, 15000)
  if (!deleted) throw new Error("Exclusão de espaço não removeu o registro")
}

async function openSpaceCalendarFromCard(page) {
  if (!state.courtId) throw new Error("Sem espaço para abrir calendário")
  await gotoApp(page, `/dashboard/arenas/${ARENA_ID}`)
  await page.getByLabel(`Abrir calendário do espaço ${data.spaceEditName}`).click({ timeout: 10000 })
  await page.waitForURL(`**/dashboard/arenas/${ARENA_ID}/courts/${state.courtId}/calendar**`, { timeout: 20000 })
  await waitForVisibleText(page, "Cadastrar reserva", { exact: true })
}

async function ensureArenaSportFlow(page) {
  if (!state.sport) throw new Error("Sem esporte de referência para vincular à arena")
  const existing = await dbFindOne("arena_sports", { arena_id: ARENA_ID, sport_id: state.sport.id }, null)
  if (existing) return

  await gotoApp(page, `/dashboard/arenas/${ARENA_ID}/edit`)
  const sportCheckbox = page.locator(`[id="${state.sport.id}"]`).first()
  if (!(await sportCheckbox.isVisible().catch(() => false))) {
    throw new Error(`Esporte ${state.sport.name} não apareceu no perfil da arena`)
  }
  const checked = await sportCheckbox.getAttribute("aria-checked").catch(() => null)
  if (checked !== "true") {
    await sportCheckbox.click()
  }
  await clickButton(page, "Salvar")
  const linked = await waitForDbOne("arena_sports", { arena_id: ARENA_ID, sport_id: state.sport.id }, null, 15000)
  if (!linked) throw new Error("Esporte da arena não persistiu no perfil")
}

async function createAthleteFlow(page) {
  await gotoApp(page, `/dashboard/athletes/${ARENA_ID}`)
  await clickButton(page, "Cadastrar atleta")
  await fillByPlaceholder(page, "000.000.000-00", data.athleteCpf)
  await clickButton(page, "Buscar")
  await page.waitForTimeout(1200)
  await fillByPlaceholder(page, "Informe o nome do atleta", data.athleteName)
  await fillByPlaceholder(page, "(00) 00000-0000", "48999999999")
  await fillByPlaceholder(page, "Informe o e-mail para contato", data.athleteEmail)
  if (state.sport) {
    await chooseOptionByText(page, "Selecione o esporte", state.sport.name)
  }
  const birth = page.locator('input[type="date"]').first()
  if ((await birth.count()) > 0) await birth.fill("1990-01-01")
  await clickButton(page, "Salvar e enviar convite")
  await page.waitForTimeout(2500)
  const athlete = await waitForDbOne("atleta", { cpf: data.athleteCpf }, "created_at")
  if (!athlete) throw new Error("Atleta não persistiu no banco")
  state.athleteId = athlete.id
}

async function existingAthleteLookupFlow(page) {
  await gotoApp(page, `/dashboard/athletes/${ARENA_ID}`)
  await clickButton(page, "Cadastrar atleta")
  await fillByPlaceholder(page, "000.000.000-00", data.athleteCpf)
  await clickButton(page, "Buscar")
  await page.waitForTimeout(1200)
  const found = page.getByText("Atleta encontrado", { exact: false })
  if (!(await found.first().isVisible().catch(() => false))) {
    throw new Error("Busca de atleta existente não mostrou o passo de atleta encontrado")
  }
  await clickButton(page, "Fechar")
}

async function createStationFlow(page) {
  await gotoApp(page, `/dashboard/arenas/${ARENA_ID}/stations/new`)
  await fillByPlaceholder(page, "Informe o nome da estação", data.stationName)
  if (state.stationType) await chooseOptionByText(page, "Selecione o tipo", state.stationType.name)
  await clickButton(page, "Cadastrar Estação")
  await page.waitForURL(`**/dashboard/arenas/${ARENA_ID}/stations**`, { timeout: 20000 }).catch(() => null)
  const station = await dbFindOne("stations", { arena_id: ARENA_ID, name: data.stationName })
  if (!station) throw new Error("Estação não persistiu no banco")
  state.stationId = station.id
}

async function editStationFlow(page) {
  if (!state.stationId) throw new Error("Sem stationId para editar")
  await gotoApp(page, `/dashboard/arenas/${ARENA_ID}/stations/${state.stationId}/edit`)
  await fillByPlaceholder(page, "Informe o nome da estação", data.stationEditName)
  await clickButton(page, "Salvar Alterações")
  await page.waitForURL(`**/dashboard/arenas/${ARENA_ID}/stations**`, { timeout: 20000 }).catch(() => null)
  const station = await waitForDbOne("stations", { id: state.stationId, name: data.stationEditName }, "created_at", 15000)
  if (!station) throw new Error("Edição de estação não persistiu")
}

async function createProductWithName(page, name) {
  await gotoApp(page, `/dashboard/settings/products/${ARENA_ID}`)
  await clickButton(page, "Cadastrar produto")
  await fillByPlaceholder(page, "Nome do produto", name)
  await fillByPlaceholder(page, "0.00", "12.50")
  await chooseDialogCombobox(page, 0, "Bebida")
  if (state.stationType) await chooseDialogCombobox(page, 1, state.stationType.name)
  await chooseDialogCombobox(page, 2, "Ativo")
  await clickButton(page, "Cadastrar")
  await page.waitForTimeout(1500)
  const product = await dbFindOne("products", { arena_id: ARENA_ID, name })
  if (!product) throw new Error("Produto não persistiu no banco")
  return product
}

async function createProductFlow(page) {
  const product = await createProductWithName(page, data.productName)
  state.productId = product.id
}

async function createServiceWithName(page, name) {
  await gotoApp(page, `/dashboard/settings/products/${ARENA_ID}`)
  await clickFirstText(page, "Serviços")
  await clickButton(page, "Cadastrar serviço")
  await fillByPlaceholder(page, "Informe o nome do serviço", name)
  await fillByPlaceholder(page, "R$ 00,00", "20.00")
  await clickButton(page, "Cadastrar")
  await page.waitForTimeout(1500)
  const service = await dbFindOne("products", { arena_id: ARENA_ID, name })
  if (!service) throw new Error("Serviço não persistiu no banco")
  return service
}

async function createServiceFlow(page) {
  const service = await createServiceWithName(page, data.serviceName)
  state.serviceId = service.id
}

async function editCatalogRow(page, name, newName, { service = false } = {}) {
  await gotoApp(page, `/dashboard/settings/products/${ARENA_ID}`)
  if (service) await clickFirstText(page, "Serviços")
  await fillByPlaceholder(page, service ? "Buscar serviços..." : "Buscar produtos...", name)
  await waitForVisibleText(page, name, { exact: true })
  const row = page.getByRole("row").filter({ hasText: name }).first()
  await row.getByRole("button").first().click({ timeout: 10000 })
  await clickVisibleText(page, "Editar")
  await fillByPlaceholder(page, service ? "Informe o nome do serviço" : "Nome do produto", newName)
  await submitDialogButton(page, "Salvar")
  const item = await waitForDbOne("products", { arena_id: ARENA_ID, name: newName }, "created_at", 15000)
  if (!item) throw new Error(`Edição de ${service ? "serviço" : "produto"} não persistiu`)
}

async function editCatalogItemsFlow(page) {
  if (!state.productId || !state.serviceId) throw new Error("Catálogo precisa de produto e serviço para editar")
  await editCatalogRow(page, data.productName, data.productEditName)
  await editCatalogRow(page, data.serviceName, data.serviceEditName, { service: true })
}

async function stockEntryFlow(page) {
  if (!state.productId) throw new Error("Sem produto para lançar estoque")
  await gotoApp(page, `/dashboard/settings/products/${ARENA_ID}`)
  await fillByPlaceholder(page, "Buscar produtos...", data.productName)
  const row = page.getByRole("row").filter({ hasText: data.productName }).first()
  await row.getByRole("button").first().click()
  await page.getByText("Lançar entrada", { exact: true }).click()
  await fillByPlaceholder(page, "0", "8")
  await fillByPlaceholder(page, "Nome do fornecedor", `${QA_PREFIX} fornecedor`)
  await clickButton(page, "Registrar Entrada")
  await page.waitForTimeout(1500)
  const product = await dbFindOne("products", { id: state.productId })
  if (!product || product.stock_quantity < 1) throw new Error("Entrada de estoque não atualizou saldo")
}

async function deleteCatalogRow(page, name, { service = false } = {}) {
  await gotoApp(page, `/dashboard/settings/products/${ARENA_ID}`)
  if (service) await clickFirstText(page, "Serviços")
  await fillByPlaceholder(page, service ? "Buscar serviços..." : "Buscar produtos...", name)
  await waitForVisibleText(page, name, { exact: true })
  const row = page.getByRole("row").filter({ hasText: name }).first()
  await row.getByRole("button").first().click({ timeout: 10000 })
  await clickVisibleText(page, "Excluir")
  await submitDialogButton(page, "Excluir")
  const deleted = await waitForDbGone("products", { arena_id: ARENA_ID, name }, 15000)
  if (!deleted) throw new Error(`Exclusão de ${service ? "serviço" : "produto"} não removeu o registro`)
}

async function createAndDeleteCatalogItemsFlow(page) {
  const product = await createProductWithName(page, data.productDeleteName)
  state.deleteProductId = product.id
  await deleteCatalogRow(page, data.productDeleteName)

  const service = await createServiceWithName(page, data.serviceDeleteName)
  state.deleteServiceId = service.id
  await deleteCatalogRow(page, data.serviceDeleteName, { service: true })
}

async function createRotativoFlow(page) {
  if (!state.courtId || !state.sport) throw new Error("Rotativo precisa de espaço e esporte")
  await gotoApp(page, `/dashboard/rotativo/${ARENA_ID}`)
  await clickButton(page, "Cadastrar rotativo")
  try {
    await chooseDialogCombobox(page, 0, state.sport.name)
  } catch {
    await chooseFirstDialogCombobox(page, 0)
  }
  const courtLabel = page.getByText(data.spaceEditName, { exact: true }).first()
  if (await courtLabel.isVisible().catch(() => false)) {
    await courtLabel.click()
  } else {
    const courtCheckbox = page.locator('[role="dialog"] input[type="checkbox"]').first()
    if (await courtCheckbox.isVisible().catch(() => false)) await courtCheckbox.click()
  }
  const dateInput = page.locator('input[type="date"]').first()
  await dateInput.fill(data.rotativoDate)
  const timeInputs = page.locator('input[type="time"]')
  if ((await timeInputs.count()) >= 2) {
    await timeInputs.nth(0).fill("18:00")
    await timeInputs.nth(1).fill("19:00")
  }
  await fillByPlaceholder(page, "R$ 00,00", "35,00")
  const limitSwitch = page.getByRole("switch").first()
  if (await limitSwitch.isVisible().catch(() => false)) {
    await limitSwitch.click()
    await page.locator('input[type="number"]').last().fill("8")
  }
  await clickButton(page, "Cadastrar")
  await page.waitForTimeout(1800)
  const rotativo = await dbFindOne("rotativos", { id_arena: ARENA_ID, data: data.rotativoDate }, "created_at")
  if (!rotativo) throw new Error("Rotativo não persistiu no banco")
  state.rotativoId = rotativo.id
}

async function launchRotativoCreditFlow(page) {
  if (!state.athleteId || !state.paymentMethod) throw new Error("Crédito precisa de atleta e forma de pagamento")
  await gotoApp(page, `/dashboard/rotativo/${ARENA_ID}`)
  await clickFirstText(page, "Gestão de créditos")
  await clickButton(page, "Salvar")
  await page.waitForTimeout(800)
  await clickButton(page, "Lançar crédito")
  await chooseDialogCombobox(page, 0, data.athleteName)
  const qty = page.locator('input[type="number"]').first()
  await qty.fill("2")
  await chooseDialogCombobox(page, 1, "30 dias")
  await chooseDialogCombobox(page, 2, state.paymentMethod.nome)
  await clickButton(page, "Finalizar")
  await page.waitForTimeout(1500)
  const { data: movements } = await supabase
    .from("rotativo_credito_movimentos")
    .select("*")
    .eq("arena_id", ARENA_ID)
    .eq("atleta_id", state.athleteId)
    .order("created_at", { ascending: false })
    .limit(1)
  if (!movements?.[0]) throw new Error("Crédito rotativo não persistiu")
  state.rotativoCreditId = movements[0].id
}

async function loyaltyFlow(page) {
  if (!state.athleteId) throw new Error("Fidelidade precisa de atleta")
  await gotoApp(page, `/dashboard/loyalty/${ARENA_ID}`)
  await clickButton(page, "Novo envio")
  await fillByPlaceholder(page, "Nome do atleta", data.athleteName)
  await page.waitForTimeout(900)
  await clickFirstText(page, data.athleteName)
  await fillByPlaceholder(page, "00", "15")
  await fillByPlaceholder(page, "Ex: Bônus de aniversário", `${QA_PREFIX} envio fidelidade`)
  await clickButton(page, "Enviar")
  await page.waitForTimeout(1500)

  await clickButton(page, "Novo resgate")
  await fillByPlaceholder(page, "Nome do atleta", data.athleteName)
  await page.waitForTimeout(900)
  await clickFirstText(page, data.athleteName)
  await fillByPlaceholder(page, "00", "5")
  await fillByPlaceholder(page, "Ex: Compra de produto", `${QA_PREFIX} resgate fidelidade`)
  await clickButton(page, "Descontar")
  await page.waitForTimeout(1500)

  await fillByPlaceholder(page, "Informe o nome da sua moeda", data.currencyName)
  await clickButton(page, "Salvar")
  await page.waitForTimeout(1000)
}

async function financeFlow(page, type, description) {
  await gotoApp(page, `/dashboard/finance/${ARENA_ID}/${type === "entrada" ? "entradas" : "saidas"}`)
  await clickButton(page, type === "entrada" ? "Nova entrada" : "Nova saída")
  await fillByPlaceholder(page, "Insira o nome do lançamento", description)
  await chooseFirstOptionFromTrigger(page, "Selecione o tipo")
  if (state.paymentMethod) await chooseOptionByText(page, "Selecione o modo de pagamento", state.paymentMethod.nome)
  const numbers = page.locator('input[type="number"]')
  if ((await numbers.count()) >= 3) {
    await numbers.nth(0).fill("1")
    await numbers.nth(1).fill(type === "entrada" ? "77.50" : "22.25")
    await numbers.nth(2).fill("0")
  }
  await clickButton(page, "Salvar")
  await page.waitForTimeout(1500)
  const tx = await dbFindOne("transactions", { arena_id: ARENA_ID, description })
  if (!tx) throw new Error(`Lançamento financeiro não persistiu: ${description}`)
  if (description === data.financeIn) state.financeInId = tx.id
  if (description === data.financeOut) state.financeOutId = tx.id
  if (description === data.financeDelete) state.financeDeleteId = tx.id
}

async function deleteFinanceTransactionFlow(page) {
  await financeFlow(page, "saída", data.financeDelete)
  await gotoApp(page, `/dashboard/finance/${ARENA_ID}/saidas`)
  await waitForVisibleText(page, data.financeDelete, { exact: true })
  const row = page.getByRole("row").filter({ hasText: data.financeDelete }).first()
  await row.getByRole("button").last().click({ timeout: 10000 })
  await submitDialogButton(page, "Excluir")
  const deleted = await waitForDbGone("transactions", { id: state.financeDeleteId }, 15000)
  if (!deleted) throw new Error("Exclusão de lançamento financeiro não removeu o registro")
}

async function reportsFlow(page) {
  const booking = state.bookingId
    ? await dbFindOne("bookings", { id: state.bookingId }, null)
    : null
  if (!booking) throw new Error("Relatório sem fonte de agendamento")

  const stationPayment = state.stationPaymentId
    ? await dbFindOne("station_payments", { id: state.stationPaymentId }, null)
    : null
  if (!stationPayment) throw new Error("Relatório sem fonte de pagamento de comanda")

  const rotativoCredit = state.rotativoCreditId
    ? await dbFindOne("rotativo_credito_movimentos", { id: state.rotativoCreditId }, null)
    : null
  if (!rotativoCredit) throw new Error("Relatório sem fonte de crédito rotativo")

  const financeIn = state.financeInId
    ? await dbFindOne("transactions", { id: state.financeInId }, null)
    : null
  if (!financeIn) throw new Error("Relatório sem fonte de entrada financeira")

  const paymentReportPath = `/dashboard/reports/${ARENA_ID}/status-pagamentos`
  const paymentAssertions = [
    data.athleteName,
    data.spaceEditName,
    "Avulso",
    "Comanda",
    data.stationEditName,
    "Cartão de crédito",
    "Crédito rotativo",
    "Entrada Manual",
  ]

  for (const text of paymentAssertions) {
    await gotoApp(page, paymentReportPath)
    await waitForVisibleTextAcrossPages(page, text, { exact: false, maxPages: 6 })
  }

  await gotoApp(page, `/dashboard/reports/${ARENA_ID}/clientes-overview`)
  await clickVisibleText(page, "Somente 1 reserva", { exact: false })
  await waitForVisibleTextAcrossPages(page, data.athleteName, { exact: false, maxPages: 6 })
  await waitForVisibleTextAcrossPages(page, formatCpfBR(data.athleteCpf), { exact: false, maxPages: 6 })

  await clickVisibleText(page, "Ativos recentes", { exact: false })
  await waitForVisibleTextAcrossPages(page, data.athleteName, { exact: false, maxPages: 6 })
}

async function usersFlow(page) {
  await gotoApp(page, `/dashboard/settings/users/${ARENA_ID}`)
  await clickButton(page, "Cadastrar Usuário")
  await fillByPlaceholder(page, "Informa o nome do usuário", data.userName)
  await fillByPlaceholder(page, "Informa o e-mail do usuário", data.userEmail)
  await fillByPlaceholder(page, "Insira uma senha para acesso do usuário com 6 dígitos", "Qa123456!")
  await chooseDialogCombobox(page, 0, "Usuário comum")
  await clickButton(page, "Cadastrar")
  await page.waitForTimeout(1800)
  const user = await dbFindOne("users", { email: data.userEmail }, "created_at")
  if (!user) throw new Error("Usuário não persistiu")
  state.userId = user.id
  const arenaUser = await dbFindOne("arena_users", { arena_id: ARENA_ID, user_id: user.id }, null)
  if (!arenaUser) throw new Error("Vínculo do usuário com a arena não persistiu")
  state.arenaUserId = arenaUser.id
}

async function deleteUserFlow(page) {
  if (!state.userId || !state.arenaUserId) throw new Error("Sem usuário criado para excluir")
  await gotoApp(page, `/dashboard/settings/users/${ARENA_ID}`)
  await waitForVisibleText(page, data.userEmail, { exact: true })
  const row = page.getByRole("row").filter({ hasText: data.userEmail }).first()
  await row.getByRole("button").first().click({ timeout: 10000 })
  await clickVisibleText(page, "Excluir")
  await submitDialogButton(page, "Excluir")

  const linkDeleted = await waitForDbGone("arena_users", { id: state.arenaUserId }, 15000)
  if (!linkDeleted) throw new Error("Exclusão de usuário não removeu vínculo com a arena")

  const userRow = await dbFindOne("users", { id: state.userId }, null)
  if (userRow) {
    const remainingLink = await dbFindOne("arena_users", { user_id: state.userId }, null)
    if (!remainingLink) throw new Error("Usuário ficou sem vínculo após exclusão")
  }
}

async function bookingFlow(page) {
  if (!state.courtId || !state.athleteId) throw new Error("Agendamento precisa de espaço e atleta")
  await openSpaceCalendarFromCard(page)
  await clickButton(page, "Cadastrar reserva")
  await fillByPlaceholder(page, "Selecione um atleta vinculado ou insira um novo", data.athleteName)
  await page.waitForTimeout(900)
  await clickFirstText(page, data.athleteName)
  await fillByPlaceholder(page, "08h00", "20:00")
  await fillByPlaceholder(page, "09h00", "21:00")
  await fillByPlaceholder(page, "00,00", "90")
  if (state.serviceId) {
    const includeServices = page.getByText("Adicionar serviço", { exact: false }).first()
    if (await includeServices.isVisible().catch(() => false)) await includeServices.click()
    const search = page.getByPlaceholder("Buscar por item").first()
    if (await search.isVisible().catch(() => false)) {
      await search.fill(data.serviceName)
      await page.waitForTimeout(500)
      const add = page.getByRole("button", { name: "Aumentar quantidade" }).first()
      if (await add.isVisible().catch(() => false)) await add.click()
    }
  }
  await clickButton(page, "Salvar")
  await page.waitForTimeout(1800)
  const booking = await dbFindOne("bookings", { arena_id: ARENA_ID, athlete_id: state.athleteId }, "created_at")
  if (!booking) throw new Error("Agendamento não persistiu")
  state.bookingId = booking.id
}

async function bookingDetailsFlow(page) {
  if (!state.bookingId) throw new Error("Sem agendamento para abrir detalhes")
  await gotoApp(page, `/dashboard/arenas/${ARENA_ID}/courts/${state.courtId}/calendar`)
  const bookingCardText = await waitForVisibleText(page, data.athleteName, { exact: false, timeoutMs: 12000 })
  await bookingCardText.click({ timeout: 10000 })
  await waitForVisibleText(page, "Detalhes da reserva", { exact: true })
  await waitForVisibleText(page, data.spaceEditName, { exact: true })
  if (state.serviceId) await waitForVisibleText(page, data.serviceName, { exact: false, timeoutMs: 5000 }).catch(() => null)
  await submitDialogButton(page, "Voltar")
}

async function cancelBookingFlow(page) {
  if (!state.bookingId) throw new Error("Sem agendamento para cancelar")
  await gotoApp(page, `/dashboard/arenas/${ARENA_ID}/courts/${state.courtId}/calendar`)
  const bookingCardText = await waitForVisibleText(page, data.athleteName, { exact: false, timeoutMs: 12000 })
  await bookingCardText.click({ timeout: 10000 })
  await waitForVisibleText(page, "Detalhes da reserva", { exact: true })

  page.once("dialog", async (dialog) => {
    await dialog.accept()
  })
  await page.getByTitle("Cancelar reserva").click({ timeout: 10000 })
  const booking = await waitForDbOne("bookings", { id: state.bookingId, status: "cancelled" }, "created_at", 15000)
  if (!booking) throw new Error("Cancelamento de reserva não persistiu")
}

async function stationOrderFlow(page) {
  if (!state.stationId || !state.athleteId) throw new Error("Comanda precisa de estação e atleta")
  await gotoApp(page, `/dashboard/arenas/${ARENA_ID}/stations/${state.stationId}`)
  await clickButton(page, "Abrir comanda")
  await fillByPlaceholder(page, "Selecione um cliente vinculado ou insira um novo", data.athleteName)
  await page.waitForTimeout(900)
  await clickFirstText(page, data.athleteName)
  const productSearch = page.getByPlaceholder("Buscar produto ou serviço (nome, tipo, produto, serviço)...").first()
  await productSearch.fill(data.productName)
  await page.waitForTimeout(500)
  const productRow = page.getByText(data.productName, { exact: true }).locator('xpath=ancestor::div[contains(@class, "group")][1]')
  const addButton = productRow.getByRole("button").last()
  if (await addButton.isVisible().catch(() => false)) {
    await addButton.click()
  } else {
    const plusButtons = page.locator('[role="dialog"] button').filter({ has: page.locator("svg") })
    if ((await plusButtons.count()) > 0) await plusButtons.last().click()
  }
  await submitDialogButton(page, "Abrir").catch(() => null)
  const order = await waitForDbOne("station_orders", { arena_id: ARENA_ID, station_id: state.stationId }, "created_at", 12000)
  if (!order) throw new Error("Comanda não persistiu")
  state.orderId = order.id
}

async function stationOrderPaymentFlow(page) {
  if (!state.orderId) throw new Error("Sem comanda para registrar pagamento")
  await gotoApp(page, `/dashboard/arenas/${ARENA_ID}/stations/${state.stationId}/orders/${state.orderId}`)
  await waitForVisibleText(page, data.productName, { exact: true })
  await clickButton(page, "Registrar pagamento")
  await chooseOptionByText(page, "Selecione a forma de pagamento", "Cartão de crédito")
  await fillByPlaceholder(page, "Nome de quem pagou", data.athleteName)
  await submitDialogButton(page, "Salvar")
  await waitForVisibleText(page, "Quer fechar a comanda?", { exact: true, timeoutMs: 10000 })
  await submitDialogButton(page, "Fechar comanda")

  const payment = await waitForDbOne("station_payments", { order_id: state.orderId }, "created_at", 15000)
  if (!payment) throw new Error("Pagamento de comanda não persistiu")
  state.stationPaymentId = payment.id

  const order = await waitForDbOne("station_orders", { id: state.orderId, status: "closed" }, "created_at", 15000)
  if (!order) throw new Error("Comanda não foi fechada após pagamento")
}

async function navigationSmoke(page) {
  const routes = [
    "/dashboard",
    "/dashboard/arenas",
    `/dashboard/arenas/${ARENA_ID}`,
    `/dashboard/athletes/${ARENA_ID}`,
    `/dashboard/arenas/${ARENA_ID}/stations`,
    `/dashboard/settings/products/${ARENA_ID}`,
    `/dashboard/arenas/${ARENA_ID}/mensalistas`,
    `/dashboard/rotativo/${ARENA_ID}`,
    `/dashboard/loyalty/${ARENA_ID}`,
    `/dashboard/finance/${ARENA_ID}`,
    `/dashboard/reports/${ARENA_ID}/status-pagamentos`,
    `/dashboard/reports/${ARENA_ID}/clientes-overview`,
    `/dashboard/settings/users/${ARENA_ID}`,
    "/dashboard/settings/arenas",
  ]

  for (const route of routes) {
    await gotoApp(page, route)
  }
}

async function writeReport() {
  const summary = {
    runId: RUN_ID,
    prefix: QA_PREFIX,
    baseUrl: BASE_URL,
    arenaId: ARENA_ID,
    arenaName: state.arenaName,
    options: {
      headless: HEADLESS,
      slowMo: SLOW_MO,
      cleanupQASpaces: CLEANUP_QA_SPACES,
    },
    data,
    state,
    totals: {
      passed: results.filter((r) => r.status === "passed").length,
      failed: results.filter((r) => r.status === "failed").length,
      skipped: results.filter((r) => r.status === "skipped").length,
    },
    results,
    consoleIssues,
  }
  fs.writeFileSync(path.join(RESULTS_DIR, "report.json"), JSON.stringify(summary, null, 2))
  const lines = [
    `# Arena Deep QA ${QA_PREFIX}`,
    "",
    `- Base URL: ${BASE_URL}`,
    `- Arena: ${state.arenaName} (${ARENA_ID})`,
    `- Passed: ${summary.totals.passed}`,
    `- Failed: ${summary.totals.failed}`,
    "",
    "## Steps",
    "",
    ...results.map((r) => {
      const base = `- ${r.status === "passed" ? "PASS" : "FAIL"} ${r.name} (${r.durationMs}ms)`
      return r.error ? `${base}\n  - ${String(r.error).split("\n")[0]}\n  - Screenshot: ${r.screenshot}` : `${base}\n  - Screenshot: ${r.screenshot}`
    }),
    "",
    "## Console Issues",
    "",
    ...(consoleIssues.length === 0 ? ["- None captured"] : consoleIssues.map((i) => `- ${i.type}: ${i.text}`)),
  ]
  fs.writeFileSync(path.join(RESULTS_DIR, "report.md"), lines.join("\n"))
}

async function main() {
  ensureDir(RESULTS_DIR)
  if (CLEANUP_QA_SPACES) await cleanupQASpaces()
  await loadReferenceData()

  const browser = await chromium.launch({ headless: HEADLESS, slowMo: SLOW_MO })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  })
  const page = await context.newPage()
  page.setDefaultTimeout(12000)
  page.on("console", (msg) => {
    if (["error", "warning"].includes(msg.type())) {
      consoleIssues.push({ type: msg.type(), text: msg.text(), url: page.url() })
    }
  })
  page.on("pageerror", (error) => {
    consoleIssues.push({ type: "pageerror", text: error.message, url: page.url() })
  })

  await step(page, "Autenticação por link mágico", async () => {
    await page.goto(await generateMagicCallbackUrl(), { waitUntil: "domcontentloaded" })
    await page.waitForURL("**/dashboard**", { timeout: 20000 })
    await dismissOverlays(page)
    await assertHealthyPage(page)
  })

  await optionalStep(page, "Navegação geral por abas principais", () => navigationSmoke(page))
  await optionalStep(page, "Espaços - criar com todos os dias e slot :30", () => createSpaceFlow(page))
  await optionalStep(page, "Espaços - editar espaço criado", () => editSpaceFlow(page))
  await optionalStep(page, "Espaços - explorar detalhes e abrir calendário", () => spaceExploreFlow(page))
  await optionalStep(page, "Espaços - criar e excluir espaço descartável", () => createAndDeleteSpaceFlow(page))
  await optionalStep(page, "Configurações - vincular esporte no perfil da arena", () => ensureArenaSportFlow(page))
  await optionalStep(page, "Atletas - cadastrar novo atleta", () => createAthleteFlow(page))
  await optionalStep(page, "Atletas - buscar CPF existente", () => existingAthleteLookupFlow(page))
  await optionalStep(page, "Estações - cadastrar estação", () => createStationFlow(page))
  await optionalStep(page, "Estações - editar estação", () => editStationFlow(page))
  await optionalStep(page, "Catálogo - cadastrar produto", () => createProductFlow(page))
  await optionalStep(page, "Catálogo - cadastrar serviço", () => createServiceFlow(page))
  await optionalStep(page, "Catálogo - lançar entrada de estoque", () => stockEntryFlow(page))
  await optionalStep(page, "Catálogo - criar e excluir produto/serviço descartáveis", () => createAndDeleteCatalogItemsFlow(page))
  await optionalStep(page, "Rotativo - cadastrar sessão", () => createRotativoFlow(page))
  await optionalStep(page, "Rotativo - lançar crédito", () => launchRotativoCreditFlow(page))
  await optionalStep(page, "Fidelidade - envio, resgate e moeda", () => loyaltyFlow(page))
  await optionalStep(page, "Financeiro - lançar entrada", () => financeFlow(page, "entrada", data.financeIn))
  await optionalStep(page, "Financeiro - lançar saída", () => financeFlow(page, "saída", data.financeOut))
  await optionalStep(page, "Agenda - agendar jogo com serviço", () => bookingFlow(page))
  await optionalStep(page, "Agenda - abrir detalhes da reserva", () => bookingDetailsFlow(page))
  await optionalStep(page, "Estações - abrir comanda com produto", () => stationOrderFlow(page))
  await optionalStep(page, "Estações - registrar pagamento e fechar comanda", () => stationOrderPaymentFlow(page))
  await optionalStep(page, "Catálogo - editar produto e serviço", () => editCatalogItemsFlow(page))
  await optionalStep(page, "Relatórios - validar dados criados em pagamentos e clientes", () => reportsFlow(page))
  await optionalStep(page, "Financeiro - excluir lançamento descartável", () => deleteFinanceTransactionFlow(page))
  await optionalStep(page, "Agenda - cancelar reserva pelo calendário", () => cancelBookingFlow(page))
  await optionalStep(page, "Configurações - adicionar usuário", () => usersFlow(page))
  await optionalStep(page, "Configurações - excluir usuário criado", () => deleteUserFlow(page))

  await writeReport()
  await browser.close()

  const failed = results.filter((result) => result.status === "failed").length
  console.log(`\nReport: ${path.join(RESULTS_DIR, "report.md")}`)
  if (failed > 0) process.exitCode = 1
}

main().catch(async (error) => {
  console.error(error)
  ensureDir(RESULTS_DIR)
  results.push({ name: "Runner bootstrap", status: "failed", error: error?.stack || String(error), durationMs: 0 })
  await writeReport().catch(() => null)
  process.exit(1)
})
