# NEXO CMS
## Feature Map

## 1. Propósito

Este documento organiza as capacidades do Nexo CMS em um mapa funcional único.

O objetivo é mostrar:

- quais capacidades existem;
- a qual domínio pertencem;
- quais capacidades dependem de outras;
- quais são centrais;
- quais são extensões;
- quais precisam existir para o MVP;
- quais devem permanecer preparadas para evolução futura.

Este documento não define a implementação detalhada de cada feature.

Ele funciona como um **mapa de escopo**, permitindo que agentes e desenvolvedores saibam onde uma capacidade pertence e quais outras áreas precisam existir para suportá-la.

Nenhuma feature descrita aqui autoriza automaticamente uma implementação específica. As especificações especializadas possuem autoridade sobre seus respectivos domínios.

---

# 2. Princípio de organização

O Nexo CMS deve ser entendido como um conjunto de domínios conectados.

```text id="s7d5m2"
                    NEXO CMS
                       │
        ┌──────────────┼──────────────┐
        │              │              │
     PROJECT         EDITOR         AI
        │              │              │
        ├── Runtime    ├── Visual     ├── Providers
        ├── Intelligence ├── Code      ├── Context
        ├── Adapters   ├── Inspector  ├── Planning
        └── Git        └── Diff       └── Execution
        │
        └──────────────┬──────────────
                       │
                   COMPONENTS
                       │
          ┌────────────┼────────────┐
          │            │            │
        Media        Design      Responsive
          │            │            │
          └────────────┼────────────┘
                       │
                  Integrations
                       │
                  Deployment
```

O mapa abaixo organiza essas áreas.

---

# 3. Feature Classification

Cada feature deverá ser classificada conceitualmente em uma das categorias:

```text id="l7ncx2"
CORE
EXTENSION
PROVIDER
ADAPTER
TOOL
UI CAPABILITY
FUTURE
```

## CORE

Capacidade fundamental necessária para o funcionamento do produto.

## EXTENSION

Capacidade adicionável sem ser obrigatoriamente parte do núcleo.

## PROVIDER

Integração intercambiável com serviço externo.

## ADAPTER

Implementação específica para compreender uma tecnologia ou sistema.

## TOOL

Ferramenta utilizada pelo usuário, Runtime ou IA para executar uma operação.

## UI CAPABILITY

Capacidade de interface que expõe funções de outras áreas.

## FUTURE

Capacidade prevista para evolução, mas que não deve ser assumida como parte do primeiro release.

---

# 4. PROJECT MANAGEMENT

## 4.1 Project Import

Permitir selecionar uma pasta existente e transformá-la em projeto gerenciado pelo Nexo.

Classificação:

```text id="f8a31c"
CORE
```

Dependências:

- Runtime;
- Filesystem;
- Project Scanner.

---

## 4.2 Project Discovery

Analisar automaticamente o projeto depois da importação.

Classificação:

```text id="1k7a6s"
CORE
```

Dependências:

- Project Scanner;
- Stack Detection;
- File System Intelligence.

---

## 4.3 Stack Detection

Detectar automaticamente tecnologias relevantes do projeto.

Classificação:

```text id="6v6pdu"
CORE
```

---

## 4.4 Manual Stack Configuration

Permitir corrigir ou informar manualmente o stack.

Classificação:

```text id="tx4a1k"
CORE
```

---

## 4.5 Custom Stack

Permitir trabalhar com uma combinação de tecnologias não prevista diretamente pelos detectores padrão.

Classificação:

```text id="9g92m4"
CORE / EXTENSIBLE
```

---

## 4.6 Project Model

Representar internamente o projeto compreendido pelo Nexo.

Classificação:

```text id="f0j4c1"
CORE
```

---

## 4.7 Project Graph

Representar relações entre elementos do projeto.

Classificação:

```text id="9ztx3h"
CORE
```

---

## 4.8 Project Status

Exibir informações como:

- stack;
- Git;
- branch;
- working tree;
- dev server;
- build;
- environment.

Classificação:

```text id="7x0jbg"
CORE
```

---

# 5. ADAPTER SYSTEM

## 5.1 Adapter Engine

Carregar e executar adapters compatíveis.

Classificação:

```text id="vky3qt"
CORE
```

---

## 5.2 Framework Adapters

Adapters para frameworks e ecossistemas.

Inicialmente previstos:

```text id="v2gqhh"
Next.js
React
Vue
Nuxt
Svelte
SvelteKit
Astro
Vite
HTML/CSS/JS
```

Classificação:

```text id="ADAPTER"
```

---

## 5.3 Styling Adapters

Adapters para sistemas de estilo.

Inicialmente previstos:

```text id="61z1lo"
Tailwind
CSS Modules
styled-components
CSS variables
```

Classificação:

```text id="ADAPTER"
```

---

## 5.4 Build Adapter

Compreender o sistema de build.

Classificação:

```text id="ADAPTER"
```

---

## 5.5 Package Manager Adapter

Compreender package managers.

Exemplos:

```text id="k9z3bi"
npm
pnpm
yarn
bun
```

Classificação:

```text id="ADAPTER"
```

---

## 5.6 Custom Adapter

Permitir adapters criados para tecnologias ou arquiteturas não contempladas oficialmente.

Classificação:

```text id="EXTENSION"
```

---

# 6. RUNTIME

## 6.1 Filesystem Access

Acessar arquivos e diretórios do ambiente do projeto.

Classificação:

```text id="CORE"
```

---

## 6.2 Terminal

Executar comandos reais no ambiente.

Classificação:

```text id="CORE"
```

---

## 6.3 Process Manager

Iniciar, monitorar e encerrar processos relacionados ao projeto.

Classificação:

```text id="CORE"
```

---

## 6.4 Development Server

Iniciar e monitorar o servidor de desenvolvimento do projeto.

Classificação:

```text id="CORE"
```

---

## 6.5 Build Runner

Executar builds reais do projeto.

Classificação:

```text id="CORE"
```

---

## 6.6 Preview Runtime

Disponibilizar o projeto para visualização.

Classificação:

```text id="CORE"
```

---

## 6.7 Runtime Permissions

Controlar acesso às capacidades do Runtime.

Classificação:

```text id="CORE / SECURITY"
```

---

# 7. VISUAL EDITOR

## 7.1 Visual Editor

Interface principal de edição visual.

Classificação:

```text id="CORE"
```

---

## 7.2 Element Selection

Selecionar elementos renderizados.

Classificação:

```text id="CORE"
```

---

## 7.3 Inspector

Visualizar e alterar propriedades disponíveis.

Classificação:

```text id="CORE"
```

---

## 7.4 Source Mapping

Relacionar elemento visual à origem no projeto.

Classificação:

```text id="CORE"
```

---

## 7.5 Code Editor

Editar código diretamente.

Classificação:

```text id="CORE"
```

---

## 7.6 Visual / Code Synchronization

Manter relacionamento coerente entre alterações visuais e código.

Classificação:

```text id="CORE"
```

---

## 7.7 Undo / Redo

Classificação:

```text id="CORE"
```

---

## 7.8 Diff

Visualizar alterações.

Classificação:

```text id="CORE"
```

---

# 8. COMPONENT SYSTEM

## 8.1 Component Detection

Identificar componentes existentes.

Classificação:

```text id="CORE"
```

---

## 8.2 Component Model

Representar componentes internamente.

Classificação:

```text id="CORE"
```

---

## 8.3 Component Schema

Representar propriedades e comportamento de componentes.

Classificação:

```text id="CORE"
```

---

## 8.4 Component Studio

Criar e editar componentes.

Classificação:

```text id="CORE / MAJOR FEATURE"
```

---

## 8.5 Component Library

Armazenar componentes reutilizáveis.

Classificação:

```text id="CORE / MAJOR FEATURE"
```

---

## 8.6 Global Components

Componentes disponíveis para múltiplos projetos.

Classificação:

```text id="CORE"
```

---

## 8.7 Project Components

Componentes específicos de um projeto.

Classificação:

```text id="CORE"
```

---

## 8.8 Component Promotion

Promover componente de projeto para biblioteca global.

Classificação:

```text id="CORE"
```

---

## 8.9 Component Versioning

Versionar componentes reutilizáveis.

Classificação:

```text id="CORE"
```

---

## 8.10 Component Compatibility

Determinar onde um componente pode ser utilizado corretamente.

Classificação:

```text id="CORE"
```

---

# 9. BUILT-IN COMPONENT LIBRARY

O Nexo deverá possuir especificações para componentes iniciais.

## 9.1 Carousel

```text id="xir8n5"
CORE COMPONENT
```

Capabilities:

- slides;
- imagens;
- textos;
- links;
- autoplay;
- speed;
- transitions;
- loop;
- navigation;
- pagination;
- responsive items;
- spacing.

---

## 9.2 Hero

```text id="9d8zy1"
CORE COMPONENT
```

Capabilities:

- title;
- subtitle;
- CTA;
- image;
- background;
- alignment;
- responsive behavior.

---

## 9.3 Gallery

```text id="f8k5p1"
CORE COMPONENT
```

---

## 9.4 Button

```text id="2l3z0u"
CORE COMPONENT
```

---

## 9.5 WhatsApp

```text id="0bqrqs"
CORE COMPONENT / INTEGRATION
```

---

## 9.6 Form

```text id="s0ofsl"
CORE COMPONENT
```

---

## 9.7 FAQ

```text id="dv2g5d"
CORE COMPONENT
```

---

## 9.8 Testimonials

```text id="x1p6g7"
CORE COMPONENT
```

---

## 9.9 Google Maps

```text id="o4g6pk"
CORE COMPONENT / INTEGRATION
```

---

## 9.10 Video

```text id="84h9i2"
CORE COMPONENT
```

---

## 9.11 Custom Embed

```text id="mm7ju2"
CORE COMPONENT / TOOL
```

---

# 10. MEDIA

## 10.1 Media Library

```text id="o07m8z"
CORE
```

---

## 10.2 Asset Index

```text id="dr7v10"
CORE
```

---

## 10.3 Asset References

```text id="r9tvv2"
CORE
```

---

## 10.4 Asset Replacement

```text id="1y1jlm"
CORE
```

---

## 10.5 Image Editing

```text id="qf86np"
CORE
```

---

## 10.6 Image Optimization

```text id="d3j78v"
CORE
```

---

## 10.7 Upload

```text id="81f2kn"
CORE
```

---

# 11. DESIGN SYSTEM

## 11.1 Color Editor

```text id="6n4v58"
CORE
```

---

## 11.2 Gradient Editor

```text id="1kt8k5"
CORE
```

---

## 11.3 Typography Editor

```text id="6c4g7u"
CORE
```

---

## 11.4 Spacing Editor

```text id="e7q1yr"
CORE
```

---

## 11.5 Radius Editor

```text id="t2th7x"
CORE
```

---

## 11.6 Shadow Editor

```text id="u8whr4"
CORE
```

---

## 11.7 Theme Editor

```text id="0i8b1b"
CORE
```

---

# 12. RESPONSIVE LAB

## 12.1 Device Presets

```text id="d5m33j"
CORE
```

---

## 12.2 Custom Viewport

```text id="6es44c"
CORE
```

---

## 12.3 Layout Stress Testing

```text id="x9k4c2"
CORE / MAJOR FEATURE
```

---

## 12.4 Overflow Detection

```text id="yd7jv0"
CORE
```

---

## 12.5 Text Wrapping Detection

```text id="t9w8g3"
CORE
```

---

## 12.6 Responsive Diagnostics

```text id="35j7u9"
CORE
```

---

## 12.7 Responsive Fix Assistance

```text id="j0m2wq"
AI-ASSISTED
```

---

# 13. CONTENT / PAGES

## 13.1 Page Explorer

```text id="e2tj9m"
CORE
```

---

## 13.2 Route Explorer

```text id="q8v7p2"
CORE
```

---

## 13.3 Page Creation

```text id="4v7h2a"
CORE
```

---

## 13.4 Content Editor

```text id="z7m2pc"
CORE
```

---

## 13.5 Metadata Editor

```text id="n4s8d1"
CORE
```

---

## 13.6 Structured Content

```text id="r8d6h2"
CORE / CONDITIONAL
```

---

## 13.7 Blog Management

```text id="5t9xkq"
CORE / CONDITIONAL
```

O suporte efetivo dependerá da arquitetura do projeto.

---

# 14. INTEGRATIONS

## 14.1 HTML Injection

```text id="5g4x3m"
CORE TOOL
```

---

## 14.2 CSS Injection

```text id="j8p4n2"
CORE TOOL
```

---

## 14.3 JavaScript Injection

```text id="k2f0z8"
CORE TOOL
```

---

## 14.4 iframe

```text id="5z7t2e"
CORE TOOL
```

---

## 14.5 External Scripts

```text id="g6p3s1"
CORE TOOL
```

---

## 14.6 Widgets

```text id="p9f4w7"
EXTENSION
```

---

## 14.7 External Services

```text id="2q8r0l"
EXTENSION
```

---

## 14.8 Integration Library

```text id="y6m1s9"
CORE / EXTENSIBLE
```

---

# 15. GIT

## 15.1 Repository Detection

```text id="n6p0w8"
CORE
```

---

## 15.2 Repository Initialization

```text id="k3x8a1"
CORE
```

---

## 15.3 GitHub Authentication

```text id="q5j2m6"
INTEGRATION
```

---

## 15.4 Repository Creation

```text id="8h3r2x"
INTEGRATION
```

---

## 15.5 Branch Management

```text id="j4p0c7"
CORE
```

---

## 15.6 Commit

```text id="0g9n5k"
CORE
```

---

## 15.7 Push / Pull / Fetch

```text id="m3s8f4"
CORE
```

---

## 15.8 Diff / History

```text id="2d7n1p"
CORE
```

---

## 15.9 Advanced Git

```text id="9x4k6v"
CORE / ADVANCED
```

Inclui:

- stash;
- merge;
- rebase;
- reset;
- revert;
- cherry-pick.

---

# 16. AI ENGINE

## 16.1 AI Provider System

```text id="6e4p8y"
CORE
```

---

## 16.2 AI Context Engine

```text id="q0y8d4"
CORE
```

---

## 16.3 Task Planning

```text id="p5n7a2"
CORE
```

---

## 16.4 Code Generation

```text id="r6x2m1"
CORE
```

---

## 16.5 Code Editing

```text id="x4k8u0"
CORE
```

---

## 16.6 Patch Generation

```text id="z7c3v5"
CORE
```

---

## 16.7 Diff Review

```text id="n1m9p4"
CORE
```

---

## 16.8 Validation

```text id="d8q2s6"
CORE
```

---

## 16.9 Autonomous Mode

```text id="5v7j0a"
CORE
```

---

## 16.10 Manual Mode

```text id="h3s6k9"
CORE
```

---

## 16.11 AI Tools

```text id="f2u8r4"
CORE
```

---

# 17. LUNA

## 17.1 Luna Provider

```text id="1r6k8m"
INTEGRATION
```

---

## 17.2 Luna Tool Bridge

```text id="0s5d3j"
INTEGRATION
```

---

## 17.3 Luna Context Bridge

```text id="9q4t7p"
INTEGRATION
```

---

## 17.4 Luna Execution Mode

```text id="w2n8x6"
INTEGRATION
```

---

# 18. SECURITY

## 18.1 Authentication

```text id="m3z7k1"
CORE
```

---

## 18.2 Authorization

```text id="t8p5c2"
CORE
```

---

## 18.3 Filesystem Permissions

```text id="r4v9j6"
CORE
```

---

## 18.4 Command Permissions

```text id="y1x3h8"
CORE
```

---

## 18.5 AI Permissions

```text id="e7q2m4"
CORE
```

---

## 18.6 Secrets Management

```text id="c9s6w0"
CORE
```

---

## 18.7 Audit Log

```text id="p2d5k7"
CORE
```

---

## 18.8 Dangerous Operation Protection

```text id="b8n1r3"
CORE
```

---

# 19. WORKSPACES

## 19.1 Workspace

```text id="6r4m8p"
CORE
```

---

## 19.2 Projects

```text id="y7k1t5"
CORE
```

---

## 19.3 Teams

```text id="n8c3q0"
FUTURE / EXTENSIBLE
```

---

## 19.4 Roles

```text id="s5v2d7"
CORE
```

---

## 19.5 Permissions

```text id="a9m4x6"
CORE
```

---

# 20. PLUGINS

## 20.1 Plugin System

```text id="q6y3h1"
EXTENSION
```

---

## 20.2 Plugin Manifest

```text id="k8p0r4"
EXTENSION
```

---

## 20.3 Plugin Lifecycle

```text id="t3m7v9"
EXTENSION
```

---

## 20.4 Plugin Permissions

```text id="z1d6c5"
EXTENSION
```

---

## 20.5 Adapter Plugins

```text id="f8w2x7"
EXTENSION
```

---

## 20.6 AI Provider Plugins

```text id="j5n9b3"
EXTENSION
```

---

## 20.7 Component Plugins

```text id="u4p6k0"
EXTENSION
```

---

## 20.8 Integration Plugins

```text id="e2r8s5"
EXTENSION
```

---

# 21. DEPLOYMENT

## 21.1 Deployment Engine

```text id="4t7x2m"
CORE
```

---

## 21.2 Preflight

```text id="6v1q9h"
CORE
```

---

## 21.3 Build Pipeline

```text id="p3n8k5"
CORE
```

---

## 21.4 Deployment Providers

Preparados inicialmente para:

```text id="9d2y7w"
Vercel
Hostinger
SSH
SFTP
FTP
Docker
```

Cada provider deverá possuir seu próprio contrato e implementação.

---

## 21.5 Deployment Verification

```text id="k0r6t3"
CORE
```

---

## 21.6 Rollback

```text id="m8x4p1"
CORE / PROVIDER-DEPENDENT
```

---

# 22. OBSERVABILITY

## 22.1 Logging

```text id="x7f2m9"
CORE
```

---

## 22.2 Runtime Logs

```text id="j4v8s3"
CORE
```

---

## 22.3 AI Logs

```text id="p5c1z6"
CORE
```

---

## 22.4 Git Logs

```text id="n2q7w4"
CORE
```

---

## 22.5 Error Tracking

```text id="r9k3d8"
CORE
```

---

## 22.6 Performance Monitoring

```text id="h6m1y5"
CORE
```

---

# 23. TESTING

## 23.1 Unit Testing

```text id="q4s8p0"
CORE
```

---

## 23.2 Integration Testing

```text id="x1v7n3"
CORE
```

---

## 23.3 Adapter Testing

```text id="d5k9r2"
CORE
```

---

## 23.4 Runtime Testing

```text id="w8m4c6"
CORE
```

---

## 23.5 Component Testing

```text id="j2p6t1"
CORE
```

---

## 23.6 AI Testing

```text id="n7x3v5"
CORE
```

---

## 23.7 Build Validation

```text id="s4q9m0"
CORE
```

---

## 23.8 Visual Regression

```text id="a1d8k7"
CORE / ADVANCED
```

---

## 23.9 End-to-End

```text id="p6y2r4"
CORE
```

---

## 23.10 Recovery Testing

```text id="m3v8n1"
CORE / ADVANCED
```

---

# 24. INTERNAL CONTRACTS

O mapa também inclui contratos formais para:

```text id="y5n8b2"
Project
Adapter
Component
AI
Git
Media
Plugin
Deployment
Runtime
Events
```

Esses contratos não são features visíveis, mas são fundamentais para que as features possam coexistir sem acoplamento excessivo.

---

# 25. DEPENDENCY OVERVIEW

As principais dependências funcionais podem ser resumidas assim:

```text id="a4q7k9"
Project Import
      ↓
Project Discovery
      ↓
Project Model
      ↓
Adapter System
      ↓
Runtime
      ↓
Editor
```

Componentes:

```text id="r2m6v8"
Project Model
      ↓
Component Detection
      ↓
Component System
      ↓
Component Studio
      ↓
Component Library
```

IA:

```text id="n9x4c5"
Project Model
      +
Runtime
      +
Adapters
      +
Tools
      ↓
AI Context
      ↓
AI Planning
      ↓
AI Patch
      ↓
Diff
      ↓
Validation
```

Deploy:

```text id="u6p1d7"
Project
↓
Git / Working Tree
↓
Build
↓
Preflight
↓
Deployment Provider
↓
Verification
```

---

# 26. PRINCIPAIS PILARES DO MVP

O primeiro produto funcional deverá priorizar os seguintes pilares:

```text id="x3f9v2"
1. Project Import
2. Project Intelligence
3. Stack Detection
4. Adapter Architecture
5. Runtime
6. Visual Editor
7. Code Editor
8. Component System
9. Component Studio
10. Component Library
11. Media Library
12. Design Editing
13. Responsive Lab
14. Git
15. AI Engine
16. Integrations
17. Security
18. Testing
```

Isso não significa que cada área precise ter todos os recursos avançados no primeiro release.

Significa que a arquitetura do MVP deve ser construída ao redor desses pilares.

---

# 27. PRINCIPAIS DIFERENCIAIS DO PRODUTO

As capacidades que mais diferenciam o Nexo de um CMS tradicional são:

## 27.1 Universal Project Intelligence

Entender projetos existentes em diferentes stacks.

## 27.2 Adapter Architecture

Respeitar a tecnologia existente.

## 27.3 Component Studio

Criar componentes reutilizáveis e transformá-los em patrimônio da biblioteca.

## 27.4 Visual + Code

Permitir trabalhar visualmente sem esconder o código.

## 27.5 Nexo AI Engineer

Permitir que IA trabalhe diretamente no contexto real do projeto.

## 27.6 Responsive Lab

Transformar responsividade em uma ferramenta de diagnóstico e não apenas preview.

## 27.7 Git-Native Workflow

Fazer versionamento parte da experiência diária.

## 27.8 Project Portability

Não prender o usuário ao Nexo.

---

# 28. FEATURES QUE NÃO DEVEM SER CONFUNDIDAS

Algumas capacidades são relacionadas, mas não equivalentes.

### Project Model ≠ Source Project

O primeiro representa entendimento.

O segundo é o projeto real.

### Component Library ≠ Project Components

Uma é global ou compartilhada.

A outra pertence ao projeto.

### AI Provider ≠ AI Engine

Provider fornece inteligência.

Engine coordena a utilização da inteligência dentro do Nexo.

### Runtime ≠ CMS

Runtime executa operações.

CMS fornece a interface e experiência de gerenciamento.

### Adapter ≠ Plugin

Adapter ensina o Nexo a lidar com uma tecnologia.

Plugin adiciona capacidades ao Nexo.

### Preview ≠ Production

Preview representa estado de teste/visualização.

Production representa ambiente publicado.

---

# 29. REGRA DE PRIORIDADE FUNCIONAL

Quando houver conflito entre várias features, a prioridade deverá ser:

```text id="5v8r3k"
1. Integridade do projeto
2. Segurança
3. Compatibilidade
4. Persistência real
5. Git / reversibilidade
6. Funcionalidade
7. UX
8. Otimização
9. Automação adicional
```

Uma feature visualmente atraente não justifica colocar em risco o projeto real.

---

# 30. REGRA DE DEPENDÊNCIA

Nenhuma feature deve ser considerada isoladamente quando depender de outra.

Exemplo:

O Component Studio não pode ser implementado como uma interface independente que não entende:

- Project Model;
- Component Model;
- Adapter;
- Runtime;
- Source Mapping.

Da mesma forma, AI não pode ser implementada como chatbot desconectado do projeto.

O mapa de features deve ser utilizado para preservar essas relações.

---

# 31. REGRA PARA O K3 SWARM

Os agentes do Swarm deverão utilizar este Feature Map para:

1. localizar a feature;
2. identificar o domínio responsável;
3. verificar dependências;
4. abrir a documentação especializada;
5. verificar contratos;
6. verificar invariantes;
7. somente então implementar.

O Feature Map não deve ser utilizado como substituto da especificação técnica.

Ele é o **índice funcional do produto**.

---

# 32. Regra de novas features

Uma nova feature não deve ser adicionada diretamente ao sistema sem primeiro determinar:

- qual domínio ela pertence;
- qual classificação possui;
- quais features dependem dela;
- quais features dependem dela;
- quais contratos serão afetados;
- quais documentos precisarão ser atualizados;
- quais testes serão necessários.

Novas features devem manter o Feature Map atualizado.

---

# 33. Estado deste documento

Este documento define o **mapa funcional oficial do Nexo CMS**.

Ele não deve conter detalhes de implementação que pertençam a documentos especializados.

Seu objetivo é garantir que:

- nenhuma parte do produto seja esquecida;
- nenhuma feature seja construída isoladamente;
- dependências sejam percebidas;
- o Swarm saiba onde procurar;
- a implementação continue alinhada com a visão do produto.

> **O Feature Map responde: “o que existe no Nexo e como essas capacidades se relacionam?”**