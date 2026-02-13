import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiBaseUrl } from '../api/config'
import { isAdmin } from '../utils/auth'
import Relogios from '../components/Relogios'
import './Dashboard.css'
import './Usuarios.css'

export default function Usuarios() {
  const navigate = useNavigate()
  const [lista, setLista] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({ nome: '', usuario: '', senha: '', ativo: true })
  const [erroForm, setErroForm] = useState('')
  const [salvando, setSalvando] = useState(false)

  // Verifica se é admin, senão redireciona
  useEffect(() => {
    if (!isAdmin()) {
      navigate('/dashboard')
    }
  }, [navigate])

  async function carregar() {
    setCarregando(true)
    setErro('')
    try {
      const res = await fetch(`${apiBaseUrl}/api/usuarios`)
      if (!res.ok) throw new Error('Falha ao carregar usuários')
      const data = await res.json()
      setLista(data)
    } catch (e) {
      setErro(e.message)
      setLista([])
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  function abrirNovo() {
    setEditando(null)
    setForm({ nome: '', usuario: '', senha: '', ativo: true })
    setErroForm('')
    setModalAberto(true)
  }

  function abrirEditar(u) {
    setEditando(u)
    setForm({ nome: u.nome, usuario: u.usuario, senha: '', ativo: !!u.ativo })
    setErroForm('')
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setEditando(null)
    setErroForm('')
  }

  function handleSubmit(e) {
    e.preventDefault()
    setErroForm('')
    if (!form.nome.trim()) {
      setErroForm('Nome é obrigatório')
      return
    }
    if (!form.usuario.trim()) {
      setErroForm('Usuário (login) é obrigatório')
      return
    }
    if (!editando && !form.senha.trim()) {
      setErroForm('Senha é obrigatória para novo usuário')
      return
    }
    setSalvando(true)
    const url = editando ? `${apiBaseUrl}/api/usuarios/${editando.id}` : `${apiBaseUrl}/api/usuarios`
    const method = editando ? 'PUT' : 'POST'
    const body = editando
      ? { nome: form.nome.trim(), usuario: form.usuario.trim(), ativo: form.ativo, ...(form.senha.trim() && { senha: form.senha }) }
      : { nome: form.nome.trim(), usuario: form.usuario.trim(), senha: form.senha, ativo: form.ativo }
    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || res.statusText)
        fecharModal()
        carregar()
      })
      .catch((e) => setErroForm(e.message))
      .finally(() => setSalvando(false))
  }

  function handleExcluir(id, nome) {
    if (!window.confirm(`Excluir o usuário "${nome}"?`)) return
    fetch(`${apiBaseUrl}/api/usuarios/${id}`, { method: 'DELETE' })
      .then((res) => {
        if (!res.ok) return res.json().then((d) => { throw new Error(d.error || 'Falha ao excluir') })
        carregar()
      })
      .catch((e) => setErro(e.message))
  }

  function formatarData(s) {
    if (!s) return '-'
    const d = new Date(s)
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  // Se não for admin, não renderiza nada (já será redirecionado)
  if (!isAdmin()) {
    return null
  }

  return (
    <main className="dashboard-page usuarios-page">
      <aside className="dashboard-sidebar" aria-label="Menu principal">
        <div className="dashboard-menu-centro">
          <Link to="/dashboard" className="dashboard-menu-quadro" title="Gerar acionamento">
            <svg className="dashboard-menu-icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </Link>
          <Link to="/historico" className="dashboard-menu-quadro" title="Histórico">
            <svg className="dashboard-menu-icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </Link>
          <span className="dashboard-menu-quadro dashboard-menu-quadro--ativo" title="Usuários">
            <svg className="dashboard-menu-icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </span>
        </div>
        <Link to="/login" className="dashboard-menu-quadro dashboard-menu-quadro--sair" title="Sair">
          <svg className="dashboard-menu-icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </Link>
      </aside>

      <div className="dashboard-conteudo">
        <Relogios />
        <div className="usuarios-conteudo">
          <div className="usuarios-header">
            <h1 className="dashboard-titulo">Usuários</h1>
            <p className="usuarios-subtitulo">Cadastro e gerenciamento de conciliadores</p>
            <button type="button" className="dashboard-btn dashboard-btn-primary usuarios-btn-novo" onClick={abrirNovo}>
              Novo usuário
            </button>
          </div>

          {erro && (
            <div className="usuarios-erro" role="alert">
              {erro}
            </div>
          )}

          {carregando ? (
            <p className="usuarios-carregando">Carregando...</p>
          ) : (
            <div className="usuarios-tabela-wrap">
              <table className="usuarios-tabela">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Usuário (login)</th>
                    <th>Ativo</th>
                    <th>Criado em</th>
                    <th aria-label="Ações" />
                  </tr>
                </thead>
                <tbody>
                  {lista.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="usuarios-vazio">
                        Nenhum usuário cadastrado. Clique em &quot;Novo usuário&quot; para começar.
                      </td>
                    </tr>
                  ) : (
                    lista.map((u) => (
                      <tr key={u.id}>
                        <td>{u.nome}</td>
                        <td>{u.usuario}</td>
                        <td>{u.ativo ? 'Sim' : 'Não'}</td>
                        <td>{formatarData(u.created_at)}</td>
                        <td>
                          <button type="button" className="usuarios-btn usuarios-btn-editar" onClick={() => abrirEditar(u)} title="Editar">
                            Editar
                          </button>
                          <button type="button" className="usuarios-btn usuarios-btn-excluir" onClick={() => handleExcluir(u.id, u.nome)} title="Excluir">
                            Excluir
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modalAberto && (
        <div className="usuarios-modal-overlay" onClick={fecharModal}>
          <div className="usuarios-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="usuarios-modal-titulo">{editando ? 'Editar usuário' : 'Novo usuário'}</h2>
            <form className="usuarios-form" onSubmit={handleSubmit}>
              {erroForm && <p className="usuarios-form-erro" role="alert">{erroForm}</p>}
              <label className="usuarios-label">
                Nome
                <input
                  type="text"
                  className="usuarios-input"
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  placeholder="Nome completo"
                />
              </label>
              <label className="usuarios-label">
                Usuário (login)
                <input
                  type="text"
                  className="usuarios-input"
                  value={form.usuario}
                  onChange={(e) => setForm((f) => ({ ...f, usuario: e.target.value }))}
                  placeholder="Login para acessar o sistema"
                  autoComplete="username"
                />
              </label>
              <label className="usuarios-label">
                {editando ? 'Nova senha (deixe em branco para não alterar)' : 'Senha'}
                <input
                  type="password"
                  className="usuarios-input"
                  value={form.senha}
                  onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))}
                  placeholder={editando ? 'Opcional' : 'Senha'}
                  autoComplete={editando ? 'new-password' : 'new-password'}
                />
              </label>
              <label className="usuarios-label usuarios-label-check">
                <input
                  type="checkbox"
                  checked={form.ativo}
                  onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))}
                />
                <span>Ativo</span>
              </label>
              <div className="usuarios-modal-actions">
                <button type="button" className="dashboard-btn dashboard-btn-outline" onClick={fecharModal}>
                  Cancelar
                </button>
                <button type="submit" className="dashboard-btn dashboard-btn-primary" disabled={salvando}>
                  {salvando ? 'Salvando...' : (editando ? 'Salvar' : 'Cadastrar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
