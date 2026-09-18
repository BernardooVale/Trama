---
name: documentacao
description: >-
  Maintain and generate hierarchical ARCHITECTURE.md files per directory.
  Activate when documenting architecture, creating new folders/files, or updating codebase documentation.
---

# Diretrizes de Documentação de Arquitetura Hierárquica (`ARCHITECTURE.md`)

Esta skill define o padrão obrigatório para criação e manutenção de arquivos `ARCHITECTURE.md` em todas as pastas de um projeto (inclusive na raiz).

---

## 1. Princípio da Responsabilidade Hierárquica

- **Cada pasta (incluindo a raiz) deve conter seu próprio arquivo `ARCHITECTURE.md`**.
- O `ARCHITECTURE.md` de uma pasta documenta exclusivamente os elementos **diretos** (filhos imediatos) presentes nela.
- **Não detalhar recursivamente**:
  - Se um elemento for uma **subpasta**: explique apenas o propósito/responsabilidade geral da pasta (o que ela faz no contexto da pasta pai). **Não** detalhe minuciosamente os arquivos internos dela ali.
  - A responsabilidade de detalhar o conteúdo interno da subpasta pertence exclusivamente ao `ARCHITECTURE.md` da própria subpasta.
  - Se um elemento for um **arquivo**: explique detalhadamente a finalidade do arquivo e **documente cada função pública/interna** (assinatura, descrição do que faz e retorno).

---

## 2. Estrutura Padrão do `ARCHITECTURE.md`

Todo arquivo `ARCHITECTURE.md` deve seguir esta estrutura:

```markdown
# Arquitetura — [Nome da Pasta / Raiz]

[Breve parágrafo contextualizando a responsabilidade deste diretório no projeto].

---

## 1. Visão Geral dos Elementos Deste Diretório

| Elemento | Tipo | Descrição / Responsabilidade |
| :--- | :--- | :--- |
| `subpasta/` | Diretório | [Explicação concisa da finalidade da subpasta. Link para subpasta/ARCHITECTURE.md] |
| `arquivo.ext` | Arquivo | [Explicação concisa do papel do arquivo neste módulo] |

---

## 2. Detalhamento dos Arquivos

### `arquivo.ext`

[Explicação detalhada da responsabilidade, escopo e dependências do arquivo].

#### Constantes / Estado Interno (se aplicável)
- `NOME_CONSTANTE`: Breve descrição.

#### Funções e Métodos

##### `nomeDaFuncao(param1, param2)`
- **Assinatura:** `nomeDaFuncao(param1: Tipo, param2?: Tipo): RetornoTipo`
- **Descrição:** Explicação clara do que a função faz, efeitos colaterais e validações.
- **Retorno:** Tipo e significado do valor retornado.

---

## 3. Subdiretórios e Links de Arquitetura

- Para detalhes dos elementos internos de cada pasta, consulte a documentação local:
  - [`subpasta/`](./subpasta/ARCHITECTURE.md)
```

---

## 3. Procedimento Operacional para o Agente

1. **Ao criar um novo diretório:**
   - Crie imediatamente o `ARCHITECTURE.md` local com a estrutura padrão.
   - Atualize o `ARCHITECTURE.md` da pasta pai adicionando a nova pasta na tabela de visão geral com link para o novo documento.

2. **Ao criar ou modificar arquivos e funções:**
   - Adicione ou atualize a seção do arquivo no `ARCHITECTURE.md` da respectiva pasta.
   - Sempre documente assinatura, descrição e retorno de cada nova função criada.

3. **Ao mover ou remover arquivos/diretórios:**
   - Remova ou realoque a documentação correspondente no `ARCHITECTURE.md` local e sincronize a pasta pai.
