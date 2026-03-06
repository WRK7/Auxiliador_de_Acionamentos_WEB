import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiBaseUrl } from '../api/config'
import { isAdmin, isAdminSupremo, getUser } from '../utils/auth'
import Relogios from '../components/Relogios'
import ConfirmModal from '../components/ConfirmModal'
import './Dashboard.css'
import './Usuarios.css'

const PERFIS = [
  { value: 'conciliador', label: 'Conciliador' },
  { value: 'admin', label: 'Admin' },
  { value: 'admin_supremo', label: 'Admin supremo' },
]

function labelPerfil(value) {
  return PERFIS.find((p) => p.value === value)?.label ?? value
}

/** Admin supremo: todos. Admin: conciliadores e a si mesmo. Conciliador: não gerencia ninguém (nem a si). */
function podeGerenciarUsuario(logado, alvo) {
  if (!logado || !alvo) return false
  if (logado.perfil === 'admin_supremo') return true
  if (logado.perfil === 'admin') return alvo.perfil === 'conciliador' || alvo.id === logado.id
  return false
}

/** Perfis que o usuário logado pode atribuir. Admin só Conciliador; ao editar a si mesmo, só o próprio perfil. */
function perfisPermitidos(logado, editando) {
  if (!logado) return []
  if (logado.perfil === 'admin_supremo') return PERFIS
  if (logado.perfil === 'admin') {
    if (editando?.id === logado.id) return [{ value: 'admin', label: 'Admin' }]
    return PERFIS.filter((p) => p.value === 'conciliador')
  }
  return []
}

export default function Usuarios() {
  const navigate = useNavigate()
  const [lista, setLista] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({ nome: '', usuario: '', senha: '', perfil: 'conciliador', ativo: true })
  const [erroForm, setErroForm] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [solicitacoes, setSolicitacoes] = useState([])
  const [solicitacoesCarregando, setSolicitacoesCarregando] = useState(true)
  const [erroSolicitacoes, setErroSolicitacoes] = useState('')
  const [confirmModal, setConfirmModal] = useState({ tipo: null, id: null, nome: null })
  const [mensagemExcluido, setMensagemExcluido] = useState(null)
  const [filtroNome, setFiltroNome] = useState('')
  const [filtroPerfil, setFiltroPerfil] = useState('todos') // 'todos' | 'admins' | 'conciliadores'

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

  async function carregarSolicitacoes() {
    setSolicitacoesCarregando(true)
    setErroSolicitacoes('')
    try {
      const res = await fetch(`${apiBaseUrl}/api/solicitacoes?status=pendente`)
      if (!res.ok) throw new Error('Falha ao carregar solicitações')
      const data = await res.json()
      setSolicitacoes(data)
    } catch (e) {
      setErroSolicitacoes(e.message)
      setSolicitacoes([])
    } finally {
      setSolicitacoesCarregando(false)
    }
  }

  function handleAprovar(id) {
    fetch(`${apiBaseUrl}/api/solicitacoes/${id}/aprovar`, { method: 'PATCH' })
      .then((res) => res.json().catch(() => ({})))
      .then((data) => {
        if (data.ok) {
          carregar()
          carregarSolicitacoes()
        } else {
          setErroSolicitacoes(data.error || 'Falha ao aprovar')
        }
      })
      .catch(() => setErroSolicitacoes('Falha ao aprovar'))
  }

  function pedirRejeitar(id) {
    setConfirmModal({ tipo: 'rejeitar', id, nome: null })
  }

  function executarRejeitar() {
    const id = confirmModal.id
    setConfirmModal({ tipo: null, id: null, nome: null })
    fetch(`${apiBaseUrl}/api/solicitacoes/${id}/rejeitar`, { method: 'PATCH' })
      .then((res) => res.json().catch(() => ({})))
      .then((data) => {
        if (data.ok) {
          carregarSolicitacoes()
        } else {
          setErroSolicitacoes(data.error || 'Falha ao rejeitar')
        }
      })
      .catch(() => setErroSolicitacoes('Falha ao rejeitar'))
  }

  useEffect(() => {
    carregar()
  }, [])

  useEffect(() => {
    if (isAdmin()) carregarSolicitacoes()
  }, [])

  function abrirNovo() {
    setEditando(null)
    setForm({ nome: '', usuario: '', senha: '', perfil: 'conciliador', ativo: true })
    setErroForm('')
    setModalAberto(true)
  }

  function abrirEditar(u) {
    setEditando(u)
    setForm({ nome: u.nome, usuario: u.usuario, senha: '', perfil: u.perfil || 'conciliador', ativo: !!u.ativo })
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
      ? { nome: form.nome.trim(), usuario: form.usuario.trim(), perfil: form.perfil, ativo: form.ativo, ...(form.senha.trim() && { senha: form.senha }) }
      : { nome: form.nome.trim(), usuario: form.usuario.trim(), senha: form.senha, perfil: form.perfil, ativo: form.ativo }
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

  function pedirExcluir(id, nome) {
    setConfirmModal({ tipo: 'excluir', id, nome })
  }

  function executarExcluir(comHistorico = false) {
    const { id, nome } = confirmModal
    if (comHistorico) {
      setConfirmModal({ tipo: null, id: null, nome: null })
      fetch(`${apiBaseUrl}/api/usuarios/${id}?forcar=1`, { method: 'DELETE' })
        .then((res) => {
          if (!res.ok) return res.json().then((d) => { throw new Error(d.error || 'Falha ao excluir') })
          carregar()
          setMensagemExcluido(nome || 'Usuário')
        })
        .catch((e) => setErro(e.message))
      return
    }
    setConfirmModal({ tipo: null, id: null, nome: null })
    fetch(`${apiBaseUrl}/api/usuarios/${id}`, { method: 'DELETE' })
      .then((res) => {
        if (res.status === 409) {
          return res.json().then((d) => {
            setConfirmModal({ tipo: 'excluir_forcar', id, nome })
            setErro('')
          })
        }
        if (!res.ok) return res.json().then((d) => { throw new Error(d.error || 'Falha ao excluir') })
        carregar()
        setMensagemExcluido(nome || 'Usuário')
      })
      .catch((e) => setErro(e.message))
  }

  function executarExcluirForcar() {
    const { id, nome } = confirmModal
    setConfirmModal({ tipo: null, id: null, nome: null })
    fetch(`${apiBaseUrl}/api/usuarios/${id}?forcar=1`, { method: 'DELETE' })
      .then((res) => {
        if (!res.ok) return res.json().then((d) => { throw new Error(d.error || 'Falha ao excluir') })
        carregar()
        setMensagemExcluido(nome || 'Usuário')
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

  const userLogado = getUser()
  const perfisSelect = perfisPermitidos(userLogado, editando)

  const listaFiltrada = lista.filter((u) => {
    const passaNome = !filtroNome.trim() || (u.nome && u.nome.toLowerCase().includes(filtroNome.trim().toLowerCase()))
    let passaPerfil = true
    if (filtroPerfil === 'admins') passaPerfil = u.perfil === 'admin' || u.perfil === 'admin_supremo'
    else if (filtroPerfil === 'conciliadores') passaPerfil = u.perfil === 'conciliador'
    return passaNome && passaPerfil
  })

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
          <Link to="/aguas-guariroba" className="dashboard-menu-quadro" title="Águas Guariroba">
            <svg className="dashboard-menu-icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="2" width="16" height="20" rx="2" />
              <line x1="8" y1="6" x2="16" y2="6" />
              <circle cx="8" cy="10" r="1.5" />
              <circle cx="12" cy="10" r="1.5" />
              <circle cx="16" cy="10" r="1.5" />
              <circle cx="8" cy="14" r="1.5" />
              <circle cx="12" cy="14" r="1.5" />
              <circle cx="16" cy="14" r="1.5" />
              <circle cx="8" cy="18" r="1.5" />
              <circle cx="12" cy="18" r="1.5" />
              <circle cx="16" cy="18" r="1.5" />
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
          <Link to="/carteiras" className="dashboard-menu-quadro" title="Carteiras">
            <svg className="dashboard-menu-icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
            </svg>
          </Link>
          {isAdminSupremo() && (
            <Link to="/exclusoes" className="dashboard-menu-quadro" title="Log de Exclusões">
              <svg className="dashboard-menu-icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                <path d="M12 8v4" />
                <path d="M12 16h.01" />
              </svg>
            </Link>
          )}
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
        {mensagemExcluido && (
          <div className="usuarios-toast-sucesso" role="status" aria-live="polite">
            <span className="usuarios-toast-icone" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <span>{mensagemExcluido} excluído com sucesso.</span>
            <button type="button" className="usuarios-toast-ok" onClick={() => setMensagemExcluido(null)}>OK</button>
          </div>
        )}
        <div className="usuarios-conteudo">
          <div className="usuarios-header">
            <h1 className="dashboard-titulo">Usuários</h1>
            <p className="usuarios-subtitulo">Cadastro e gerenciamento de conciliadores</p>
            <button type="button" className="dashboard-btn dashboard-btn-primary usuarios-btn-novo" onClick={abrirNovo}>
              Novo usuário
            </button>
          </div>

          {!carregando && (
            <div className="usuarios-filtros">
              <input
                type="text"
                className="usuarios-filtro-input"
                placeholder="Buscar por nome..."
                value={filtroNome}
                onChange={(e) => setFiltroNome(e.target.value)}
                aria-label="Buscar por nome"
              />
              <div className="usuarios-filtro-perfil" role="group" aria-label="Filtrar por perfil">
                <button
                  type="button"
                  className={`usuarios-filtro-btn ${filtroPerfil === 'todos' ? 'usuarios-filtro-btn--ativo' : ''}`}
                  onClick={() => setFiltroPerfil('todos')}
                >
                  Todos
                </button>
                <button
                  type="button"
                  className={`usuarios-filtro-btn ${filtroPerfil === 'admins' ? 'usuarios-filtro-btn--ativo' : ''}`}
                  onClick={() => setFiltroPerfil('admins')}
                >
                  Admins
                </button>
                <button
                  type="button"
                  className={`usuarios-filtro-btn ${filtroPerfil === 'conciliadores' ? 'usuarios-filtro-btn--ativo' : ''}`}
                  onClick={() => setFiltroPerfil('conciliadores')}
                >
                  Conciliadores
                </button>
              </div>
            </div>
          )}

          {erro && (
            <div className="usuarios-erro" role="alert">
              {erro}
            </div>
          )}

          {carregando ? (
            <p className="usuarios-carregando">Carregando...</p>
          ) : (
            <div className="usuarios-layout">
              <div className="usuarios-tabela-wrap">
              <table className="usuarios-tabela">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Usuário (login)</th>
                    <th>Perfil</th>
                    <th>Ativo</th>
                    <th>Criado em</th>
                    <th aria-label="Ações" />
                  </tr>
                </thead>
                <tbody>
                  {listaFiltrada.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="usuarios-vazio">
                        {lista.length === 0
                          ? 'Nenhum usuário cadastrado. Clique em "Novo usuário" para começar.'
                          : 'Nenhum usuário encontrado com os filtros aplicados.'}
                      </td>
                    </tr>
                  ) : (
                    listaFiltrada.map((u) => (
                      <tr key={u.id}>
                        <td>{u.nome}</td>
                        <td>{u.usuario}</td>
                        <td><span className="usuarios-perfil" data-perfil={u.perfil}>{labelPerfil(u.perfil)}</span></td>
                        <td>{u.ativo ? 'Sim' : 'Não'}</td>
                        <td>{formatarData(u.created_at)}</td>
                        <td>
                          {podeGerenciarUsuario(userLogado, u) ? (
                            <>
                              <button type="button" className="usuarios-btn usuarios-btn-editar" onClick={() => abrirEditar(u)} title="Editar">
                                Editar
                              </button>
                              <button type="button" className="usuarios-btn usuarios-btn-excluir" onClick={() => pedirExcluir(u.id, u.nome)} title="Excluir">
                                Excluir
                              </button>
                            </>
                          ) : (
                            <span className="usuarios-acao-restrita" title="Sem permissão para este perfil">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              </div>
              <aside className="usuarios-sidebar">
                <div className="usuarios-card usuarios-card-solicitacoes">
                  <h3 className="usuarios-card-titulo">Solicitações</h3>
                  {solicitacoesCarregando ? (
                    <p className="usuarios-card-texto">Carregando...</p>
                  ) : erroSolicitacoes ? (
                    <p className="usuarios-card-erro">{erroSolicitacoes}</p>
                  ) : solicitacoes.length === 0 ? (
                    <p className="usuarios-card-texto">Nenhuma solicitação pendente.</p>
                  ) : (
                    <ul className="usuarios-solicitacoes-lista">
                      {solicitacoes.map((s) => (
                        <li key={s.id} className="usuarios-solicitacao-item">
                          <span className="usuarios-solicitacao-nome">{s.nome}</span>
                          <span className="usuarios-solicitacao-usuario">{s.usuario}</span>
                          <span className="usuarios-solicitacao-data">{formatarData(s.created_at)}</span>
                          <div className="usuarios-solicitacao-acoes">
                            <button type="button" className="usuarios-btn usuarios-btn-editar" onClick={() => handleAprovar(s.id)} title="Aprovar">Aprovar</button>
                            <button type="button" className="usuarios-btn usuarios-btn-excluir" onClick={() => pedirRejeitar(s.id)} title="Rejeitar">Rejeitar</button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </aside>
            </div>
          )}
        </div>
      </div>

      {modalAberto && (
        <div className="usuarios-modal-overlay" role="dialog" aria-modal="true">
          <div className="usuarios-modal">
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
                Perfil
                <select
                  className="usuarios-input usuarios-select"
                  value={perfisSelect.some((p) => p.value === form.perfil) ? form.perfil : (perfisSelect[0]?.value ?? 'conciliador')}
                  onChange={(e) => setForm((f) => ({ ...f, perfil: e.target.value }))}
                >
                  {perfisSelect.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
                <span className="usuarios-label-hint">Conciliador: acesso a tudo exceto esta área (Usuários). Quem se cadastra e é aprovado começa como conciliador; um admin pode alterar o perfil depois. Admin: tudo exceto admin supremo e outros admins. Admin supremo: tudo.</span>
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

      <ConfirmModal
        open={confirmModal.tipo === 'excluir'}
        title="Excluir usuário"
        message={confirmModal.nome ? `Excluir o usuário "${confirmModal.nome}"?` : 'Excluir este usuário?'}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={() => executarExcluir(false)}
        onCancel={() => setConfirmModal({ tipo: null, id: null, nome: null })}
      />
      <ConfirmModal
        open={confirmModal.tipo === 'excluir_forcar'}
        title="Excluir usuário mesmo assim?"
        message={confirmModal.nome ? `O usuário "${confirmModal.nome}" possui acionamentos ou registros da calculadora vinculados. Os registros permanecerão no sistema sem vínculo com usuário. Deseja excluir o usuário mesmo assim?` : 'Este usuário possui acionamentos ou registros vinculados. Os registros permanecerão no sistema sem vínculo. Deseja excluir mesmo assim?'}
        confirmLabel="Excluir mesmo assim"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={executarExcluirForcar}
        onCancel={() => setConfirmModal({ tipo: null, id: null, nome: null })}
      />
      <ConfirmModal
        open={confirmModal.tipo === 'rejeitar'}
        title="Rejeitar solicitação"
        message="Rejeitar esta solicitação de cadastro?"
        confirmLabel="Rejeitar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={executarRejeitar}
        onCancel={() => setConfirmModal({ tipo: null, id: null, nome: null })}
      />
    </main>
  )
}
