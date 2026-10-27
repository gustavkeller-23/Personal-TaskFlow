# TaskFlow — Gerenciador de Tarefas Desktop

Aplicativo desktop para gerenciamento de tarefas pessoais, construído com Electron.js.

## Funcionalidades

- ✅ Criar, editar, marcar como concluída e excluir tarefas
- 🏷️ Categorias para organizar tarefas
- 🔴🟡🟢 Prioridades (Alta, Média, Baixa)
- 📅 Data de vencimento com alertas de atraso
- 🔍 Busca e ordenação
- 💾 Armazenamento local em JSON
- 🌙 Interface dark mode premium

## Tecnologias

- **Electron.js** — Framework desktop
- **HTML/CSS/JS** — Interface
- **JSON** — Armazenamento local

## Como Executar

```bash
# Instalar dependências
npm install

# Iniciar o aplicativo
npm start
```

## Atalhos

| Atalho | Ação |
|--------|------|
| `Ctrl+N` | Nova tarefa |
| `Esc` | Fechar modal |

## Estrutura

```
├── main.js          # Processo principal do Electron
├── preload.js       # Bridge entre main e renderer
├── index.html       # Interface do app
├── styles.css       # Estilos
├── renderer.js      # Lógica do frontend
└── package.json     # Configuração do projeto
```
