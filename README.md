# IAH Educacional: Plataforma

**Laboratório digital para ensinar Inteligência Artificial com pensamento crítico no Ensino Médio.**

🌐 [Site](https://iaheducacional.com.br/) · 🖥️ [Demonstração](https://iah-platform.vercel.app) · 📫 [Contato (LinkedIn)](https://www.linkedin.com/in/professorfabioege/)

> **Status:** produto funcional em modo demonstração, com base de produção implementada. **Em preparação para o primeiro piloto escolar.** Ainda não há resultados de uso em escola.

---

## Por que existe

Escolas que querem ensinar IA com seriedade enfrentam três lacunas:

1. **Metodologia:** a maioria recorre a cursos genéricos ou improvisa.
2. **Conteúdo autoral:** faltam materiais alinhados a uma proposta pedagógica clara.
3. **Plataforma:** as ferramentas disponíveis hospedam arquivos, mas não sustentam investigação real.

O IAH responde às três. O estudante assume o papel de **Auditor da Realidade**: questiona, verifica e produz conhecimento *com* IA, em vez de só consumir conteúdo sobre ela.

## O que a plataforma faz

| Para quem | O que entrega |
|---|---|
| **Professor** | Autoria de aulas e missões (Mission Studio), publicação para turmas, avaliação e devolutiva |
| **Estudante** | Missões investigativas, produção, entrega e reflexão sobre o próprio processo |
| **Gestão escolar** | Indicadores de acompanhamento pedagógico da escola |

**Jornada completa implementada:** publicar missão → produzir → entregar → refletir → avaliar → devolutiva → indicadores.

## Arquitetura

- **Next.js 15 (App Router) + TypeScript**: aplicação única com produto e site
- **Supabase / PostgreSQL**: persistência via Server Actions
- **Auth.js**: login por e-mail/senha ou Google
- **Segurança:** RLS em todas as tabelas, acesso ao banco só pelo servidor, autorização por escola (tenant) e papel
- **Dois modos:** demonstração e produção, controlados por configuração

## Documentação

O produto é documentado junto ao código, com visão, decisões e roadmap:

| Documento | Conteúdo |
|---|---|
| [VISION.md](docs/VISION.md) | Por que o IAH existe e o que ele não é |
| [PRODUCT.md](docs/PRODUCT.md) | Arquitetura funcional e módulos |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Arquitetura técnica |
| [DECISIONS.md](docs/DECISIONS.md) | Registro de decisões |
| [STATUS.md](docs/STATUS.md) | Estado atual do desenvolvimento |
| [ROADMAP.md](docs/ROADMAP.md) | Próximas etapas |

## Parcerias

Buscamos **patrocinadores para o piloto escolar**, **escolas participantes** e **parceiros estratégicos** (licenciamento ou aquisição). Fale pelo [LinkedIn](https://www.linkedin.com/in/professorfabioege/) ou pelo [site](https://iaheducacional.com.br/).

---

Criado por **[Fabio Ege](https://github.com/profabioege)**, professor de História, Filosofia e Sociologia e fundador do IAH Educacional.

© Fabio Ege. Todos os direitos reservados.
