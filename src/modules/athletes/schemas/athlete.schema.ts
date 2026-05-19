import * as z from 'zod'
import { isValidCpf, onlyDigits } from '@/lib/brasil-document'

const cpfSchema = z
    .string()
    .transform((value) => onlyDigits(value))
    .refine((value) => isValidCpf(value), "CPF inválido.")

export const athleteFormSchema = z.object({
    name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
    cpf: cpfSchema,
    phone: z.string().min(10, "Telefone inválido."),
    email: z.string().email("E-mail inválido."),
    birthDate: z.string().optional(),
    sport: z.string().min(1, "Selecione um esporte."),
    nivelHabilidade: z.string().optional(),
    cep: z.string().optional(),
    endereco: z.string().optional(),
    enderecoNumero: z.string().optional(),
    bairro: z.string().optional(),
    idMunicipio: z.number().optional(),
})

export type AthleteFormValues = z.infer<typeof athleteFormSchema>

export const lookupAthleteByCpfSchema = z.object({
    cpf: cpfSchema,
    arenaId: z.string().min(1, "Arena é obrigatória."),
})

export type LookupAthleteByCpfInput = z.infer<typeof lookupAthleteByCpfSchema>

export const linkExistingAthleteSchema = z.object({
    athleteId: z.string().uuid("Atleta inválido."),
    arenaId: z.string().min(1, "Arena é obrigatória."),
})

export type LinkExistingAthleteInput = z.infer<typeof linkExistingAthleteSchema>

export const linkAthleteSchema = z.object({
    name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
    cpf: cpfSchema,
    phone: z.string().min(10, "Telefone inválido."),
    email: z.string().email("E-mail inválido."),
    sportId: z.string().min(1, "Selecione um esporte."),
    arenaId: z.string().min(1, "Arena é obrigatória."),
    nivelHabilidadeId: z.string().optional(),
    birthDate: z.string().optional(),
    cep: z.string().optional(),
    endereco: z.string().optional(),
    enderecoNumero: z.string().optional(),
    bairro: z.string().optional(),
    idMunicipio: z.number().optional(),
})

export type LinkAthleteInput = z.infer<typeof linkAthleteSchema>
