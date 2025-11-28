import { writable, derived } from "svelte/store"

type UserRole = "funcionario" | "coordenador" | "direcao" | "super_admin"

interface User {
  id: string
  name: string
  email: string
  phone: string
  role: UserRole
  companyId: number
  companyName?: string
}

function createAuthStore() {
  const user = writable<User | null>(null)

  // Restaurar sessão do localStorage ao inicializar
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("user")
    if (stored) {
      try {
        const parsedUser = JSON.parse(stored)
        if (parsedUser && parsedUser.id && parsedUser.companyId) {
          user.set(parsedUser)
        } else {
          localStorage.removeItem("user")
        }
      } catch (error) {
        console.error("[v0] Erro ao restaurar usuário:", error)
        localStorage.removeItem("user")
      }
    }
  }

  const isAuthenticated = derived(user, ($user) => $user !== null)
  const isSuperAdmin = derived(user, ($user) => $user?.role === "super_admin")
  const isManager = derived(
    user,
    ($user) => $user?.role === "coordenador" || $user?.role === "direcao" || $user?.role === "super_admin",
  )

  async function login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    const WEBHOOK_URL = "https://auto.agiussolar.cloud/webhook/login"

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = await response.json()

      if (data.success === true) {
        const rawCompanyId = data.user.company_id || data.user.companyId
        const companyId = Number.parseInt(String(rawCompanyId), 10)

        if (isNaN(companyId) && data.user.role != "super_admin") {
          console.error("[v0] companyId inválido na resposta do login:", rawCompanyId)
          return { success: false, error: "Dados de empresa inválidos" }
        }

        const userData: User = {
          id: String(data.user.id),
          name: String(data.user.name),
          email: String(data.user.email),
          phone: String(data.user.phone),
          role: String(data.user.role) as UserRole,
          companyId: companyId,
          companyName: data.user.companyName || data.json?.companyName,
        }

        localStorage.setItem("user", JSON.stringify(userData))
        user.set(userData)

        const verificacao = localStorage.getItem("user")

        return { success: true }
      }

      return { success: false, error: "Credenciais inválidas" }
    } catch (error) {
      console.error("[v0] Erro no login:", error)
      return { success: false, error: "Erro ao conectar com o servidor" }
    }
  }

  async function resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    // <WEBHOOK> Coloque aqui a URL do webhook N8N para reset de senha
    const WEBHOOK_URL = 'https://auto.agiussolar.cloud/webhook/reset-password';

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      // Simulação - sempre retorna sucesso
      return { success: true }
    } catch (error) {
      return { success: false, error: "Erro ao enviar email de recuperação" }
    }
  }

  function logout() {
    user.set(null)
    localStorage.removeItem("user")
  }

  function updateUser(userData: Partial<User>) {
    user.update((current) => {
      if (current) {
        const updated = { ...current, ...userData }
        localStorage.setItem("user", JSON.stringify(updated))
        return updated
      }
      return null
    })
  }

  return {
    user,
    isAuthenticated,
    isSuperAdmin,
    isManager,
    login,
    resetPassword,
    logout,
    updateUser,
  }
}

export const authStore = createAuthStore()
