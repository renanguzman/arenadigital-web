"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getSupabaseAdmin } from "@/lib/supabase-server"
import { provisionOwnerArena } from "@/modules/users/actions/userActions"
import { findUserByCpf, findUserByEmail, normalizeEmail, resolveAuthenticatedDbUser } from "@/lib/account-identity"
import { isValidCpfOrCnpj, onlyDigits } from "@/lib/brasil-document"
import { hasWebBackofficeAccess, WEB_BACKOFFICE_ACCESS_DENIED_MESSAGE } from "@/lib/server-auth"

type AddressData = {
    cep?: string
    state?: string
    city?: string
    id_municipio?: number
    neighborhood?: string
    street?: string
    number?: string
    complement?: string
}

type SignUpInput = {
    email: string
    password: string
    emailRedirectTo: string
    firstName: string
    lastName: string
    cpf: string
    phone: string
    arenaName: string
    arenaDocument: string
    addressData: AddressData
}

type ActionResult<T = undefined> =
    | { success: true; data?: T }
    | { success: false; error: string }

function getErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message
    return "Erro desconhecido"
}

function normalizeEmailRedirectTo(value: string) {
    try {
        const url = new URL(value)
        if (!['http:', 'https:'].includes(url.protocol)) return undefined
        if (url.pathname !== '/auth/callback') return undefined
        return url.toString()
    } catch {
        return undefined
    }
}

function validateArenaSignupData(input: Pick<SignUpInput, "arenaName" | "arenaDocument" | "phone" | "addressData">) {
    if (!input.arenaName.trim()) return "Informe o nome da arena."
    if (!input.phone.trim()) return "Informe o telefone da arena."
    if (!onlyDigits(input.arenaDocument)) return "Informe o CPF ou CNPJ da arena."
    if (!isValidCpfOrCnpj(input.arenaDocument)) return "Informe um CPF ou CNPJ válido."
    if (!input.addressData.id_municipio) return "Selecione a cidade da arena."
    return null
}

export async function checkArenaSignupEmailAction(emailInput: string): Promise<ActionResult<{
    status: "new-user" | "existing-app-user" | "existing-web-user"
    name?: string | null
}>> {
    try {
        const email = normalizeEmail(emailInput)
        if (!email) return { success: false, error: "Informe um e-mail válido." }

        const admin = getSupabaseAdmin()
        const existingUser = await findUserByEmail(admin, email)

        if (!existingUser) {
            return { success: true, data: { status: "new-user" } }
        }

        const canAccessWeb = await hasWebBackofficeAccess(existingUser.id)
        if (canAccessWeb) {
            return {
                success: true,
                data: {
                    status: "existing-web-user",
                    name: existingUser.name,
                },
            }
        }

        return {
            success: true,
            data: {
                status: "existing-app-user",
                name: existingUser.name,
            },
        }
    } catch (error) {
        console.error("checkArenaSignupEmailAction error:", error)
        return { success: false, error: getErrorMessage(error) }
    }
}

// Inicia o cadastro de um novo gestor.
// Cria entrada em auth.users via supabase.auth.signUp (envia link de confirmação por email).
// O trigger on_auth_user_created já cria a linha em public.users com nome/documento vindos do metadata.
// A criação da arena fica para depois do callback de confirmação (provisionAfterSignUpAction).
export async function startSignUpAction(input: SignUpInput): Promise<ActionResult> {
    try {
        const validationError = validateArenaSignupData(input)
        if (validationError) return { success: false, error: validationError }

        const supabase = await createSupabaseServerClient()
        const admin = getSupabaseAdmin()
        const email = normalizeEmail(input.email)
        const cleanCpf = onlyDigits(input.cpf)
        const emailRedirectTo = normalizeEmailRedirectTo(input.emailRedirectTo)

        const [existingUserByEmail, existingUserByCpf] = await Promise.all([
            findUserByEmail(admin, email),
            findUserByCpf(admin, cleanCpf),
        ])

        if (existingUserByEmail) {
            return {
                success: false,
                error: "Já existe uma conta com este e-mail. O painel web é exclusivo para gestores e o app é exclusivo para atletas. Use outro e-mail para cadastrar uma arena.",
            }
        }

        if (existingUserByCpf && normalizeEmail(existingUserByCpf.email) !== email) {
            return {
                success: false,
                error: "Este CPF/CNPJ já está vinculado a outro e-mail. Use o e-mail cadastrado ou recupere o acesso.",
            }
        }

        const { error } = await supabase.auth.signUp({
            email,
            password: input.password,
            options: {
                ...(emailRedirectTo ? { emailRedirectTo } : {}),
                data: {
                    firstName: input.firstName,
                    lastName: input.lastName,
                    cpf: input.cpf,
                    phone: input.phone,
                    arenaName: input.arenaName,
                    arenaDocument: input.arenaDocument,
                    addressData: input.addressData,
                },
            },
        })

        if (error) {
            return { success: false, error: error.message }
        }

        return { success: true }
    } catch (error) {
        console.error("startSignUpAction error:", error)
        return { success: false, error: getErrorMessage(error) }
    }
}

// Provisiona arena + arena_user a partir do metadata do cadastro.
// Chamado após confirmação de email (/auth/callback) e no login, para cobrir quem
// confirma o e-mail mas entra depois pela tela de login.
export async function provisionAfterSignUpAction(): Promise<ActionResult<{ arenaCreated: boolean }>> {
    try {
        const supabase = await createSupabaseServerClient()
        const { data: authData, error: authError } = await supabase.auth.getUser()

        if (authError || !authData.user) {
            return { success: false, error: "Usuário não autenticado" }
        }

        const user = authData.user
        const meta = (user.user_metadata ?? {}) as Record<string, unknown>
        const arenaName = typeof meta.arenaName === "string" ? meta.arenaName : undefined
        const arenaDocument = typeof meta.arenaDocument === "string" ? meta.arenaDocument : undefined
        const phone = typeof meta.phone === "string" ? meta.phone : undefined
        const addressData = meta.addressData

        // Garante linha em public.users com documento/phone (trigger faz nome+role, mas pode faltar documento em casos de OAuth)
        const admin = getSupabaseAdmin()
        const cpf = typeof meta.cpf === "string" ? meta.cpf : undefined
        if (cpf) {
            await admin.from("users").update({ cpf }).eq("id", user.id)
        }

        if (arenaName) {
            await provisionOwnerArena(user.id, arenaName, phone, addressData, arenaDocument)
            return { success: true, data: { arenaCreated: true } }
        }

        return { success: true, data: { arenaCreated: false } }
    } catch (error) {
        console.error("provisionAfterSignUpAction error:", error)
        return { success: false, error: getErrorMessage(error) }
    }
}

export async function ensureWebBackofficeAccessAction(): Promise<ActionResult> {
    try {
        const supabase = await createSupabaseServerClient()
        const { data: authData, error: authError } = await supabase.auth.getUser()

        if (authError || !authData.user) {
            return { success: false, error: "Usuário não autenticado" }
        }

        const admin = getSupabaseAdmin()
        const dbUser = await resolveAuthenticatedDbUser(admin, authData.user.id)

        if (!dbUser?.id) {
            await supabase.auth.signOut()
            return { success: false, error: "Usuário não provisionado para acessar o painel web." }
        }

        const canAccessWeb = await hasWebBackofficeAccess(dbUser.id)
        if (!canAccessWeb) {
            await supabase.auth.signOut()
            return { success: false, error: WEB_BACKOFFICE_ACCESS_DENIED_MESSAGE }
        }

        return { success: true }
    } catch (error) {
        console.error("ensureWebBackofficeAccessAction error:", error)
        return { success: false, error: getErrorMessage(error) }
    }
}
