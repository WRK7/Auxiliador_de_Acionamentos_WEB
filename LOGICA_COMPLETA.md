# 📘 Lógica Completa – Auxiliador de Acionamentos

Documento de referência da lógica de negócio, fluxos e regras do sistema **Gerador de Acionamentos**.

---

## 1. Visão geral do sistema

### 1.1 Objetivo
Aplicação desktop (Tkinter) para **gerar modelos de acionamento** padronizados a partir de:
- **Carteira** (cliente/contrato, ex.: SENAC RJ, CEDAE, UNIMED)
- **Tipo de acionamento** (ex.: ACD - ACORDO, ACP - ACORDO PARCELADO)
- **Campos de entrada** dinâmicos (variam por carteira + tipo)

O texto gerado é usado para registro de atendimento e pode ser copiado para área de transferência. Cada geração é salva no **histórico** com ID sequencial.

### 1.2 Fluxo principal (resumido)
1. Usuário escolhe **Carteira** → tipos disponíveis são filtrados (`TIPOS_POR_CARTEIRA`).
2. Usuário escolhe **Tipo** → campos exibidos vêm de `CAMPOS_POR_TIPO` (chave `"Carteira - Tipo"` ou só `"Tipo"`).
3. Preenche campos → validação em tempo real (CPF/CNPJ, datas, porcentagens, obrigatórios).
4. **Gerar Modelo** → valida tudo, monta texto pelo template em `MODELOS_ACIONAMENTO`, salva no histórico e exibe no `Text`.
5. **Copiar** → envia o conteúdo do modelo para o clipboard (pyperclip).

---

## 2. Arquitetura de arquivos

| Arquivo | Responsabilidade |
|--------|-------------------|
| **main.py** | Ponto de entrada: cria `tk.Tk()`, instancia `AcionamentoApp(root)` e inicia `mainloop()`. |
| **app.py** | Classe `AcionamentoApp`: UI principal (sidebar + área do modelo), bind de eventos, scroll, atalhos, criação de campos com validação, integração com histórico e gerador. |
| **config.py** | Dados centralizados: `CARTEIRAS`, `TIPOS_ACIONAMENTO`, `CAMPOS_INFO`, `CAMPOS_OBRIGATORIOS`, `PRAZO_MAXIMO_POR_CARTEIRA`, `TIPOS_POR_CARTEIRA`, `FORMATACAO_AUTOMATICA`, `CAMPOS_POR_TIPO`, `MODELOS_ACIONAMENTO`. |
| **historico.py** | Classe `HistoricoManager`: caminho da pasta `historico/`, leitura/escrita de `acionamentos.json` e `contador.json`, IDs sequenciais, backup, busca com filtros e busca “inteligente” (ID, CPF, valor, texto fuzzy). |
| **historico_ui.py** | Classe `HistoricoUI`: janela de histórico (filtros, tabela Treeview, detalhes, excluir, backup, estatísticas, ajuda da busca). Singleton por variável global `janela_historico_aberta`. |
| **model_generator.py** | Classe `ModelGenerator`: validação antes de gerar (CPF/CNPJ, datas, porcentagens, obrigatórios), montagem do modelo via template, formatação de descontos em linha única, salvamento no histórico, cópia para clipboard. |
| **validators.py** | Classe estática `Validator`: validação e formatação de CPF, CNPJ, data DD/MM/AAAA, data de vencimento (prazo por carteira), data futura, moeda, porcentagem; `obter_tipo_documento`. |
| **field_validators.py** | Classe `FieldValidators`: validação por tipo de campo (CPF/CNPJ, datas, porcentagens, obrigatórios), formatação automática (moeda, %, data 8 dígitos), limite de teclas em porcentagem, mensagens para tooltip. |
| **theme.py** | `DARK_THEME` (cores) e `setup_dark_theme()` para estilos ttk (Combobox, Labelframe). |
| **ui_components.py** | Componentes reutilizáveis: tooltip, janela de ajuda (atalhos), botão minimalista. |

---

## 3. Configuração (config.py) – regras de negócio

### 3.1 Carteiras
- Lista `CARTEIRAS`: ex.: SENAC RJ, SENAC MS, SENAC BA, CEDAE, SESC, CASSEMS, UNIMED, FIRJAN, FIEB. (SENAC MS e SENAC BA são carteiras distintas: prazos e campos podem diferir.)
- Podem ser adicionadas dinamicamente com `if "X" not in CARTEIRAS: CARTEIRAS.append("X")`.

### 3.2 Tipos de acionamento
- **Lista global** `TIPOS_ACIONAMENTO`: todos os tipos possíveis.
- **Tipos por carteira** `TIPOS_POR_CARTEIRA`: para cada carteira, lista de tipos permitidos.  
  Ex.: `"SENAC RJ": ["ACD - ACORDO", "ACD - ACORDO PARCELADO"]`.  
  Ao trocar a carteira, o combo de tipo é preenchido só com esses valores.

### 3.3 Campos
- **CAMPOS_INFO**: dicionário { nome_do_campo: valor_inicial }. Define todos os campos que podem aparecer e valor padrão (geralmente `""`).
- **CAMPOS_OBRIGATORIOS**: lista de nomes de campos que não podem ficar vazios na hora de **Gerar Modelo** (e que podem ganhar asterisco * na UI).
- **CAMPOS_POR_TIPO**: dicionário que define **quais campos** mostrar para cada combinação:
  - Chave preferencial: `"Carteira - Tipo"` (ex.: `"SENAC RJ - ACD - ACORDO"`).
  - Fallback: chave só com `"Tipo"` se não existir a chave carteira-tipo.
  - Valor: lista ordenada de nomes de campos (devem estar em `CAMPOS_INFO`).

### 3.4 Prazo máximo por carteira
- **PRAZO_MAXIMO_POR_CARTEIRA**: dias máximos entre “hoje” e a **Data de Vencimento**.
  - Ex.: SENAC RJ: 7, UNIMED: 2. Default usado quando a carteira não está no dicionário: 7.

### 3.5 Formatação automática
- **FORMATACAO_AUTOMATICA**: mapa { nome_campo: tipo } com tipos: `"cpf_cnpj"`, `"data"`, `"moeda"`, `"porcentagem"`.  
  Usado para aplicar formatação no `FocusOut` (field_validators e, onde couber, validators).

### 3.6 Modelos de texto
- **MODELOS_ACIONAMENTO**: dicionário { chave: template_string }.
  - Chave: `"Carteira - Tipo"` (ex.: `"CEDAE - ACV - ACORDO À VISTA"`).
  - Template: string com placeholders `{Nome do Devedor}`, `{CPF/CNPJ}`, `{Data de Vencimento}`, etc.
  - Descontos: no template usa-se uma única linha; os valores de **Desconto Principal**, **Desconto Juros** e **Desconto Multa** são substituídos por uma linha formatada (ex.: `34% PRINCIPAL 100% JUROS 23% MULTA`) no `model_generator` antes do `.format()`.

---

## 4. Validação – regras detalhadas

### 4.1 Validators (validators.py) – núcleo
- **CPF**: 11 dígitos; rejeita sequência repetida; validação dos dois dígitos verificadores.
- **CNPJ**: 14 dígitos; rejeita sequência repetida; validação dos dois dígitos verificadores.
- **formatar_cpf_cnpj**: só números → máscara CPF (xxx.xxx.xxx-xx) ou CNPJ (xx.xxx.xxx/xxxx-xx) conforme quantidade de dígitos.
- **validar_data**: formato exato DD/MM/AAAA e data válida.
- **validar_data_vencimento(data_str, carteira, prazo_maximo_por_carteira)**:
  - Formato DD/MM/AAAA.
  - Data >= hoje.
  - Data <= hoje + `prazo_maximo_por_carteira[carteira]` (default 7).
  - Retorno: `(bool, mensagem)`.
- **validar_data_futura**: formato DD/MM/AAAA e data >= hoje (sem limite superior).
- **formatar_data**: 8 dígitos → DD/MM/AAAA.
- **formatar_moeda**: números (e eventual vírgula/ponto) → "R$ X.XXX,XX" (padrão BR).
- **formatar_porcentagem**: números → "X,X%" (até 4 dígitos, vírgula antes dos últimos 2).
- **obter_tipo_documento**: 11 dígitos → "CPF", 14 → "CNPJ", senão "INDEFINIDO".

### 4.2 FieldValidators (field_validators.py) – uso na UI
- **validar_campo(campo, valor)** → bool: usado para ícone ✓/✗ em tempo real.
- **validar_campo_com_mensagem(campo, valor)** → (bool, str): usado para tooltip no status.
- **aplicar_formatacao_automatica(campo, valor)** (no FocusOut):
  - Moeda: adiciona "R$ " se ainda não tiver.
  - Porcentagem (exceto campo "Desconto" FIEB): adiciona "%" se não tiver.
  - Data (Data de Vencimento, Data de Pagamento, etc.): se o usuário digitar 8 dígitos, insere barras DD/MM/AAAA.
- **limitar_entrada(campo, event)** (KeyPress):
  - Porcentagem: bloqueia letras; permite apenas dígitos, vírgula, ponto; ponto é convertido para vírgula.
- **Campo obrigatório**: qualquer campo que esteja em `CAMPOS_OBRIGATORIOS` não pode ficar vazio na geração; na UI, obrigatórios podem ser marcados com * e cor de perigo.
- **Porcentagem**: 0–100; apenas números e uma vírgula; sem letras.
- **Data de vencimento**: usa `PRAZO_MAXIMO_POR_CARTEIRA` e `carteira_var` para obter o prazo; mesma regra que `Validator.validar_data_vencimento`.
- **Referência**: tratada como data livre (qualquer DD/MM/AAAA válida).
- **Novo Vencimento**: data >= hoje (sem limite de dias).

### 4.3 ModelGenerator – validação na geração
- Antes de montar o modelo:
  - Coleta todos os valores dos `campos_entries` (ignorando placeholders "DD/MM/AAAA", "Ex: 26/09/2025").
  - Para cada campo:
    - **CPF/CNPJ**: se preenchido, exige 11 ou 14 dígitos e validação CPF/CNPJ.
    - **Data de Vencimento / Vencimento Acordo / Data de Pagamento**: validação com prazo por carteira (e data >= hoje).
    - **Novo Vencimento**: data >= hoje.
    - **Desconto Principal/Juros/Multa**: porcentagem válida (0–100, sem letras).
    - **Obrigatórios**: todo campo em `CAMPOS_OBRIGATORIOS` deve estar preenchido.
- Se houver qualquer falha, o texto da área do modelo é substituído pela mensagem de erro listando os campos inválidos e (se `mostrar_popup=True`) é exibido um `messagebox.showwarning`. Não salva no histórico nem atualiza o modelo.

---

## 5. Geração do modelo (model_generator.py)

### 5.1 Chave do template
- `chave_template = f"{carteira} - {tipo}"`.
- Busca em `MODELOS_ACIONAMENTO`:
  1. Por `chave_template`.
  2. Fallback por `tipo` apenas.
  3. Se não achar: gera modelo genérico (cabeçalho + campos preenchidos + linha de descontos se houver).

### 5.2 Descontos em linha única
- **Desconto Principal**, **Desconto Juros**, **Desconto Multa** não são colocados no template como linhas separadas.
- `_formatar_descontos_linha_unica(informacoes)`:
  - Para cada um dos três que tiver valor, adiciona string do tipo `"34% PRINCIPAL"`, `"100% JUROS"`, `"23% MULTA"`.
  - Junta com espaço: `"34% PRINCIPAL 100% JUROS 23% MULTA"`.
- No template, normalmente existe um único placeholder (ex.: `{Desconto Principal}`) que é preenchido com essa linha; `Desconto Juros` e `Desconto Multa` são passados vazios para o `.format()`.
- `_limpar_porcentagem`: remove tudo que não for dígito ou vírgula e normaliza para o número usado na linha.

### 5.3 Substituição no template
- `re.findall(r"\{([^}]+)\}", template)` para achar todas as chaves.
- Para cada chave, garante entrada em `dados_template` (default `""`).
- `modelo = template.format(**dados_template)` e retorno `modelo.strip()`.

### 5.4 Após gerar
- Chama `historico_manager.salvar_acionamento(carteira, tipo, informacoes, modelo)`.
- Substitui o conteúdo do `Text` pelo modelo gerado.

### 5.5 Copiar modelo
- Lê o texto do `Text`.
- Remove linhas de cabeçalho (que começam com "Carteira:", "Data:", "===").
- Copia o restante (dados) para o clipboard com `pyperclip.copy` e mostra mensagem de sucesso.

---

## 6. Histórico (historico.py)

### 6.1 Caminhos
- Com PyInstaller (`sys.frozen`): pasta base = diretório do executável.
- Caso contrário: pasta do script.
- Sempre: `pasta_historico = base_dir / "historico"`, `acionamentos.json` e `contador.json` dentro dela.
- `criar_estrutura_pastas()`: cria `historico/`, `historico/ano/`, `historico/ano/mes/`, `historico/backups/`.

### 6.2 ID sequencial
- **obter_proximo_id(tipo_acionamento)**:
  - Prefixo do tipo: parte antes de " - " ou primeiros 3 caracteres (ex.: ACD, ACV, VIA).
  - Chave no contador: `"{prefixo}_{ano}"` (ex.: `ACD_2025`).
  - Incrementa contador em `contador.json` e retorna string `"{prefixo}-{ano}-{numero:03d}"` (ex.: ACD-2025-001).

### 6.3 Estrutura de um acionamento salvo
```json
{
  "id": "ACD-2025-001",
  "data_criacao": "DD/MM/AAAA HH:MM:SS",
  "carteira": "SENAC RJ",
  "tipo": "ACD - ACORDO",
  "informacoes": { "Nome do Devedor": "...", "CPF/CNPJ": "...", ... },
  "modelo_gerado": "texto completo do modelo",
  "usuario": "getpass.getuser()",
  "computador": "socket.gethostname()",
  "ip": "socket.gethostbyname(...)"
}
```

### 6.4 Busca com filtros (buscar_acionamentos)
- **filtros** pode conter:
  - **carteira**: igualdade exata.
  - **tipo**: substring em `acionamento['tipo']` (`tipo not in` seria exato; no código usa `not in` para tipo).
  - **usuario**: igualdade.
  - **data_inicio** / **data_fim**: data de criação em DD/MM/AAAA; inclusivo.
  - **texto**: busca “inteligente” (ver abaixo).
  - **valor_minimo**: valor numérico; compara com campos de valor (ex.: Valor da Dívida, Valor Total Atualizado) com conversão de string moeda para float.
- Retorno: lista de acionamentos que passam em todos os filtros.

### 6.5 Busca inteligente por texto (_busca_avancada_match)
Ordem de decisão:
1. **ID** (_eh_busca_por_id): padrões como `ABC-2025-001`, `ABC-001`, `2025-001`, etc. → _buscar_por_id (exato, parcial ou por componentes).
2. **CPF/CNPJ** (_eh_busca_por_cpf): 3–14 dígitos ou string com números/pontos → _buscar_por_cpf (só números, exato ou parcial no documento).
3. **Valor** (_eh_busca_por_valor): contém "r$" ou só números/vírgulas/pontos → _buscar_por_valor (margem ±10% em campos de valor).
4. **Texto**: _buscar_em_campos_texto em Nome do Devedor, Empresa, Cliente, Contratante, Titular, Observações, Telefone, E-mail, WhatsApp; também na carteira e no tipo. Inclui:
   - substring exata;
   - _busca_fuzzy_match (SequenceMatcher, threshold 0.8; 0.9 para texto ≤3 caracteres);
   - busca por palavras (todas as palavras com ≥2 caracteres presentes no valor).

### 6.6 Estatísticas (obter_estatisticas)
- total, por_carteira, por_tipo (prefixo do tipo), por_usuario, por_mes (MM/AAAA).

### 6.7 Outros
- **duplicar_acionamento(id)**: retorna cópia do acionamento sem id, data_criacao, usuario, computador, ip, modelo_gerado (para reutilizar dados).
- **excluir_acionamento(id)**: remove do array e salva.
- **fazer_backup**: salva cópia em `historico/backups/backup_YYYYMMDD_HHMMSS.json`.
- **restaurar_backup(arquivo)**: faz backup do atual e depois substitui conteúdo por do arquivo.
- **obter_lista_backups**: lista arquivos backup_*.json na pasta backups com nome, caminho, tamanho, data.

---

## 7. Interface principal (app.py)

### 7.1 Inicialização
- Título "Gerador de Acionamentos", geometria 1000x650, fundo do tema escuro, redimensionável.
- `setup_dark_theme()`.
- Carrega config (carteiras, tipos, campos_info).
- Instancia `HistoricoManager()`, `ModelGenerator(historico_manager)`.
- `criar_interface()` (e só depois `field_validators = FieldValidators(carteira_var)` pois depende dos combos).
- `setup_keyboard_shortcuts()`.

### 7.2 Layout
- **Header**: título e subtítulo.
- **Sidebar (esquerda)**:
  - LabelFrame "Configurações": combo Carteira, combo Tipo.
  - LabelFrame "Campos de Entrada": Canvas + Scrollbar + frame scrollável onde ficam os campos; scroll só aparece quando o conteúdo é maior que a altura do canvas.
- **Área direita**:
  - LabelFrame "Modelo de Acionamento": `Text` + Scrollbar.
  - Botões: Gerar Modelo, Copiar, Limpar, Histórico, Ajuda.

### 7.3 Comportamento dos combos
- **Carteira** (`<<ComboboxSelected>>`): `revalidar_data_vencimento` (atualiza label de prazo máximo e tipos por carteira) e `atualizar_tipos_por_carteira`.
- **Tipo** (`<<ComboboxSelected>>`): `atualizar_modelo_por_tipo` → `atualizar_campos_por_tipo` e `gerar_modelo(mostrar_popup=False)`.

### 7.4 Campos dinâmicos (atualizar_campos_por_tipo)
- Chave: primeiro `f"{carteira} - {tipo}"` em `CAMPOS_POR_TIPO`, senão `tipo`.
- Esconde todos os frames de campo existentes.
- Para cada nome na lista de campos: se já existe entry/frame, só faz pack; senão chama `criar_campo_com_validacao` e guarda em `campos_entries` e `campos_frames`.
- Caso especial: **ÁGUAS DE JOINVILLE** + campo "Unidade": se Unidade estiver vazia, pré-preenche "COMPANHIA ÁGUAS DE JOINVILLE EM JOINVILLE".

### 7.5 Criar campo com validação (criar_campo_com_validacao)
- Frame por campo; label com cor por tipo (desconto principal/juros/multa, WhatsApp, E-mail, valores, data).
- Se campo está em `CAMPOS_OBRIGATORIOS`, label com * e cor danger.
- Entry com cores de fundo/texte por tipo de campo; largura fixa 30.
- Para "Data de Vencimento": label de prazo máximo (Máx: X dias) ao lado.
- Placeholders:
  - Datas: "DD/MM/AAAA" ou "Ex: 26/09/2025" para Data de Vencimento; FocusIn remove, FocusOut recoloca se vazio.
  - CEDAE ACP + Forma de Pagamento: "CARTÃO DE CRÉDITO OU BOLETO".
  - FIRJAN ACF À VISTA: Valor Total Atualizado e Forma de Pagamento com textos específicos.
- Label de status (✓/✗) ao lado do entry.
- Bind: KeyPress → limitar_entrada; KeyRelease → validar_tempo_real; FocusOut → aplicar_formatacao_automatica e validar_tempo_real.
- validar_tempo_real: ignora placeholder; se vazio limpa status; senão chama `validar_campo_com_mensagem` e atualiza ícone, borda e tooltip.

### 7.6 Scroll dos campos
- Mouse wheel no canvas só faz scroll se a scrollbar estiver visível.
- update_scroll_region: ajusta bbox do canvas; se altura necessária > altura do canvas, mostra scrollbar; senão esconde e desliga yscrollcommand.

### 7.7 Ações
- **Gerar Modelo**: `model_generator.gerar_modelo(carteira, tipo, campos_entries, carteira_var, texto_modelo, mostrar_popup)`.
- **Copiar**: `model_generator.copiar_modelo(texto_modelo)`.
- **Limpar**: pergunta "Deseja limpar todos os campos?"; limpa carteira, tipo, todos os entries e texto do modelo; chama `mostrar_instrucao_campos()`.
- **Abrir Histórico**: instancia `HistoricoUI(root)` (singleton: se já existir janela, apenas lift/focus).
- **Gerar e copiar (Ctrl+S)**: gerar depois copiar.
- **Fechar janelas (Escape)**: destroy de todos os Toplevel filhos da root.
- **Ajuda (F1)**: `UIComponents.create_help_window(root)`.

### 7.8 Atalhos de teclado
- F5: Gerar Modelo.
- Ctrl+H: Abrir histórico.
- Ctrl+N: Limpar campos.
- Ctrl+C: Copiar (bind no texto do modelo).
- Ctrl+S: Gerar e copiar.
- Escape: Fechar janelas secundárias.
- F1: Ajuda.

---

## 8. Histórico – interface (historico_ui.py)

### 8.1 Janela
- Toplevel 1000x700, tema escuro; ao fechar seta `janela_historico_aberta = None`.
- Se já existir janela aberta, apenas lift e focus.

### 8.2 Filtros
- Busca inteligente: Entry com placeholder "Digite CPF, nome, ID, valor..."; KeyRelease com delay 500 ms → aplicar_filtros.
- Combos Carteira (valores de config + "Todas") e Tipo (prefixos dos tipos em TIPOS_POR_CARTEIRA + "Todos").
- Período: Todos, Hoje, Últimos 7 dias, Últimos 30 dias, Este mês → converte para data_inicio/data_fim nos filtros.
- Valor mínimo: entry numérico.
- Botões: Atualizar (carregar_dados), Estatísticas, Ajuda da Busca.

### 8.3 Tabela
- Treeview colunas: ID, Data, Carteira, Tipo, Devedor, Valor, Usuário.
- Cada item tem tag = id do acionamento (para recuperar na exclusão/detalhes).
- Double-click ou botão "Ver Detalhes": abre janela com apenas o texto `modelo_gerado`.

### 8.4 Botões de ação
- Ver Detalhes, Excluir (com janela de confirmação customizada para não minimizar), Backup, Exportar (placeholder), Fechar.
- Excluir: confirma → historico_manager.excluir_acionamento(id) → carregar_dados e feedback visual temporário.

### 8.5 Estatísticas e Ajuda da Busca
- Estatísticas: nova janela com texto (total, por carteira, tipo, usuário, mês).
- Ajuda da Busca: texto explicando busca por ID, CPF, valor, nome/texto, carteira/tipo e dicas.

---

## 9. Tema e componentes (theme.py, ui_components.py)

### 9.1 DARK_THEME
- Cores: bg_primary, bg_secondary, bg_tertiary, surface, border, text_primary/secondary/muted, accent, success, warning, danger, hover (e variantes _bg quando existem).

### 9.2 setup_dark_theme
- ttk theme 'clam'; estilos Dark.TCombobox (campo e listbox) e Dark.TLabelframe para combinar com o fundo escuro.

### 9.3 UIComponents
- create_tooltip(widget, texto): Enter mostra Toplevel com label, Leave ou 3 s destroem.
- create_help_window(parent): Toplevel com lista de atalhos (F5, Ctrl+H, etc.) e botão Fechar.

---

## 10. Estrutura dos JSON

### 10.1 historico/acionamentos.json
- Array de objetos; cada objeto = um acionamento (id, data_criacao, carteira, tipo, informacoes, modelo_gerado, usuario, computador, ip), como na seção 6.3.

### 10.2 historico/contador.json
- Objeto { "PREFIXO_ANO": numero } (ex.: "ACD_2025": 40). Usado para gerar o próximo ID sem colisão.

---

## 11. Campos e regras por carteira

Resumo extraído do `config.py`: prazo máximo (dias) para Data de Vencimento, tipos disponíveis e campos exibidos para cada combinação **Carteira + Tipo**.  
Campos marcados com * fazem parte de `CAMPOS_OBRIGATORIOS` (obrigatórios na geração).

### 11.1 Prazo máximo (Data de Vencimento)

| Carteira    | Prazo máximo |
|------------|---------------|
| SENAC RJ    | 7 dias        |
| SENAC MS    | **3 dias**    |
| SENAC BA    | 7 dias        |
| CEDAE       | 7 dias        |
| SESC        | 7 dias        |
| CASSEMS     | 7 dias        |
| UNIMED      | **2 dias**    |
| FIRJAN      | 7 dias        |
| FIEB        | 7 dias        |
| (outras)    | 7 dias (default) |

---

### 11.2 SENAC RJ
- **Tipos:** ACD - ACORDO | ACD - ACORDO PARCELADO

**SENAC RJ - ACD - ACORDO**  
Campos: Nome do Devedor*, CPF/CNPJ*, Valor Total Atualizado*, Desconto Principal*, Desconto Juros*, Desconto Multa*, Valor Proposto*, Data de Vencimento*, WhatsApp*, E-mail, Observações.

**SENAC RJ - ACD - ACORDO PARCELADO**  
Campos: Nome do Devedor*, CPF/CNPJ*, Valor Total Atualizado*, Desconto Principal*, Desconto Juros*, Desconto Multa*, Valor Proposto*, Entrada de*, Quantidade de Parcelas*, Valor das Parcelas*, Data de Vencimento*, WhatsApp*, E-mail, Observações.

---

### 11.3 SENAC MS
- **Tipos:** ACD - ACORDO | ACD - ACORDO PARCELADO  
- **Prazo:** 3 dias.

**SENAC MS - ACD - ACORDO**  
Campos: Nome do Devedor*, CPF/CNPJ*, CRE/Contrato*, Valor Total Atualizado*, Desconto Principal*, Desconto Juros*, Desconto Multa*, Valor Proposto*, Data de Vencimento*, Valor Confirmado*, Horário da Ligação*, WhatsApp*, E-mail, Observações.

**SENAC MS - ACD - ACORDO PARCELADO**  
Campos: idem + Entrada de*, Quantidade de Parcelas*, Valor das Parcelas*.

---

### 11.4 SENAC BA
- **Tipos:** ACD - ACORDO | ACD - ACORDO PARCELADO  
- **Prazo:** 7 dias. Formas de pagamento diferentes de MS.

**SENAC BA - ACD - ACORDO**  
Campos: Nome do Devedor*, CPF/CNPJ*, CRE/Contrato*, Valor Total Atualizado*, Desconto Principal*, Desconto Juros*, Desconto Multa*, Valor Proposto*, Data de Vencimento*, **Forma de Pagamento***, WhatsApp*, E-mail, Observações.

**SENAC BA - ACD - ACORDO PARCELADO**  
Campos: idem + Entrada de*, Quantidade de Parcelas*, Valor das Parcelas*.

---

### 11.5 CEDAE
- **Tipos:** ACV - ACORDO À VISTA | ACP - ACORDO PARCELADO | VIA - SEGUNDA VIA

**CEDAE - ACV - ACORDO À VISTA**  
Campos: Matrícula*, Gravação (Telefone)*, Valor Original*, Valor Atualizado*, Desconto Principal*, Desconto Juros*, Desconto Multa*, Valor Proposto*, Data de Vencimento*, Forma de Pagamento*, WhatsApp*, E-mail, Observações.  
*Placeholder:* Forma de Pagamento = "CARTÃO DE CRÉDITO OU BOLETO" (quando tipo ACP).

**CEDAE - ACP - ACORDO PARCELADO**  
Campos: Matrícula*, Gravação (Telefone)*, Valor Original*, Valor Atualizado*, Desconto Principal*, Desconto Juros*, Desconto Multa*, Valor Proposto para Parcelamento*, Entrada (Boleto)*, Qtd de Parcelas*, Valor das Parcelas*, Data de Vencimento*, Forma de Pagamento*, WhatsApp*, E-mail, Observações.

**CEDAE - VIA - SEGUNDA VIA**  
Campos: Nome*, Matrícula*, Fatura Vencida*, Valor*, Novo Vencimento*, Telefone*, E-mail. *(Sem descontos; Data de Vencimento não se aplica; usa Novo Vencimento.)*

---

### 11.6 SESC
- **Tipos:** ACD - ACORDO | ACD - PARCELADO

**SESC - ACD - ACORDO**  
Campos: Nome do Devedor*, CPF/CNPJ*, CRE/Contrato*, Valor Total Atualizado*, Desconto Principal*, Desconto Juros*, Desconto Multa*, Valor Proposto*, Data de Vencimento*, WhatsApp*, E-mail, Observações.

**SESC - ACD - PARCELADO**  
Campos: Nome do Devedor*, CPF/CNPJ*, CRE/Contrato*, Valor Total Atualizado*, Desconto Principal*, Desconto Juros*, Desconto Multa*, Valor Proposto*, Entrada de*, QUANT P*, Valor das Parcelas*, Data de Vencimento*, WhatsApp*, E-mail, Observações.

---

### 11.7 CASSEMS
- **Tipos:** ACC - A VISTA | ACC - PARCELADO

**CASSEMS - ACC - A VISTA**  
Campos: Nome do Devedor*, CPF/CNPJ*, TITULO*, Valor Original*, Valor Total*, Desconto Principal*, Desconto Juros*, Desconto Multa*, Valor Proposto*, Data de Vencimento*, WhatsApp*, E-mail, Observações.

**CASSEMS - ACC - PARCELADO**  
Campos: Nome do Devedor*, CPF/CNPJ*, TITULO*, Valor Original*, Valor Total*, Desconto Principal*, Desconto Juros*, Desconto Multa*, Valor Proposto*, Entrada*, Parcelas*, Valor da Parcela*, Data de Vencimento*, WhatsApp*, E-mail, Observações.

---

### 11.8 FIRJAN
- **Tipos:** ACF - A VISTA | ACF - BOLETO

**FIRJAN - ACF - A VISTA**  
Campos: Unidade*, Nome do Devedor*, CPF/CNPJ*, E-mail*, Telefone*, Valor Total Atualizado*, Desconto Principal*, Desconto Juros*, Desconto Multa*, Valor Proposto*, Forma de Pagamento*, Data de Vencimento*, WhatsApp*, E-mail, Observações.  
*Placeholders:* Valor Total Atualizado = "(se encontra no campo como valor ORIGINAL)"; Forma de Pagamento = "(Pix, deposito em conta corrente, Nº de Parcelas no cartão de crédito: 3X)".

**FIRJAN - ACF - BOLETO**  
Campos: Unidade*, Nome do Devedor*, CPF/CNPJ*, E-mail*, Telefone*, Valor Total Atualizado*, Desconto Principal*, Desconto Juros*, Desconto Multa*, Entrada*, Quantidade de Parcelas*, Valor de Cada Parcela*, Forma de Pagamento*, Data de Vencimento*, WhatsApp*, E-mail, Observações.

---

### 11.9 FIEB
- **Tipos:** ACD - A VISTA | ACD - BOLETO  
- **Regra especial:** campo **"Desconto"** (único, livre) — sem formatação automática de %; não usa Desconto Principal/Juros/Multa.

**FIEB - ACD - A VISTA**  
Campos: Unidade*, Nome do Devedor*, CPF/CNPJ*, Referência*, Valor Original*, Valor Total Atualizado*, Desconto, Valor Proposto*, Data de Vencimento*, Forma de Pagamento*, WhatsApp*, E-mail, Observações.

**FIEB - ACD - BOLETO**  
Campos: Unidade*, Nome do Devedor*, CPF/CNPJ*, Referência*, Valor Original*, Valor Total Atualizado*, Desconto, Valor Proposto*, Valor da Entrada*, Quantidade de Parcelas*, Valor de Cada Parcela*, Data de Vencimento*, Forma de Pagamento*, WhatsApp*, E-mail, Observações.

---

### 11.10 UNIMED
- **Tipos:** ACD - ACORDO  
- **Regra:** usa **Data de Pagamento** (e prazo 2 dias); não usa "Data de Vencimento" no mesmo sentido das outras carteiras.

**UNIMED - ACD - ACORDO**  
Campos: Contratante*, CPF/CNPJ*, Faturas a Pagar*, Títulos*, Dias em Atraso*, Forma de Pagamento*, Data de Pagamento*, Valor Original*, Valor Atualizado*, Telefone*. *(Sem descontos em linha; sem WhatsApp/E-mail/Observações no template.)*

---

### 11.11 Observações gerais
- **Obrigatórios:** a lista global `CAMPOS_OBRIGATORIOS` no config contém todos os nomes que são obrigatórios em algum fluxo; na prática, todo campo exibido (exceto Observações e, em alguns templates, E-mail) costuma ser obrigatório para poder gerar.
- **Formatação:** CPF/CNPJ (máscara), datas (DD/MM/AAAA), moeda (R$), porcentagem (%) — ver `FORMATACAO_AUTOMATICA` e seção 4.
- Para incluir nova carteira/tipo: adicionar em `CARTEIRAS` / `TIPOS_POR_CARTEIRA`, em `CAMPOS_POR_TIPO` (chave `"Carteira - Tipo"`), em `MODELOS_ACIONAMENTO` e, se necessário, em `PRAZO_MAXIMO_POR_CARTEIRA` e `CAMPOS_OBRIGATORIOS`.

---

## 12. Casos especiais e dependências

- **ÁGUAS DE JOINVILLE**: Unidade pré-preenchida com "COMPANHIA ÁGUAS DE JOINVILLE EM JOINVILLE" (config não inclui essa carteira; a lógica está em app.py).
- **FIEB**: campo "Desconto" (único) sem formatação automática de porcentagem no field_validators.
- **Placeholders CEDAE/FIRJAN**: definidos em app.py no criar_campo_com_validacao.
- **Campo obrigatório**: verificado em field_validators (para ícone) e em model_generator (para bloquear geração); lista em config `CAMPOS_OBRIGATORIOS`.
- **pyperclip**: necessário para Copiar; em alguns ambientes pode exigir dependência de sistema (xclip, etc.) no Linux.
- **HistoricoManager** usa getpass e socket para usuario/computador/ip; em alguns ambientes pode falhar e precisar tratamento.

---

## 13. Resumo do fluxo de dados (geração)

1. Usuário seleciona Carteira → atualiza tipos no combo e prazo máximo da data.
2. Usuário seleciona Tipo → atualiza lista de campos (CAMPOS_POR_TIPO), exibe/oculta entries, gera modelo em background (sem popup).
3. Usuário preenche campos → validação e formatação em tempo real (FieldValidators + Validator).
4. Usuário clica Gerar Modelo (ou F5):
   - ModelGenerator coleta valores (sem placeholders), valida CPF/CNPJ, datas, porcentagens, obrigatórios.
   - Se inválido: mensagem no Text e popup; fim.
   - Se válido: obtém template (MODELOS_ACIONAMENTO), formata descontos em linha única, faz format(**dados), chama HistoricoManager.salvar_acionamento (que gera ID, grava em acionamentos.json e incrementa contador), e coloca o texto no Text.
5. Copiar: lê o Text, remove cabeçalhos, pyperclip.copy do restante.

Este documento cobre a lógica de negócio, fluxos e regras do Auxiliador de Acionamentos para uso como referência única e completa.
