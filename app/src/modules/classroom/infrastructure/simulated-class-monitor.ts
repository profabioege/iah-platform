import type {
  ClassMonitorReader,
  StudentMissionSnapshot,
} from "../domain/class-monitor";

/**
 * Fonte SIMULADA do acompanhamento de turma (dados fictícios, autorizados
 * para esta fase de demonstração). Substituição futura: implementar
 * {@link ClassMonitorReader} sobre o banco de dados e trocar a injeção na
 * página do painel — nenhum componente de interface muda.
 *
 * Datas fixas (determinísticas) para evitar divergência entre servidor e
 * cliente na hidratação.
 */
const turma: StudentMissionSnapshot[] = [
  {
    studentId: "a01",
    studentName: "Ana Beatriz Souza",
    status: "concluiu",
    lastAccessAt: "2026-07-16T10:42:00-03:00",
    production:
      "Veredito 1: falsa — nenhuma outra fonte confirma. Veredito 2: real — " +
      "duas agências publicaram no mesmo dia. Veredito 3: falsa — a foto é de " +
      "2019. Veredito 4: real. Minha manchete: \"Prefeitura anuncia aulas de " +
      "drone para o 6º ano\" — engana porque cita uma fonte oficial que não existe.",
    reflection:
      "Quase acreditei na manchete 3 porque a foto parecia recente. Aprendi a " +
      "procurar a data original da imagem antes de confiar.",
  },
  {
    studentId: "a02",
    studentName: "Bruno Ferreira Lima",
    status: "concluiu",
    lastAccessAt: "2026-07-16T10:38:00-03:00",
    production:
      "Auditoria: 1 falsa (sem autor), 2 real, 3 falsa (site imita portal " +
      "conhecido), 4 real. Manchete criada: \"Escola de Itu proíbe caneta azul\" " +
      "— crível porque parece regra escolar comum; denuncia-se pela ausência de fonte.",
    reflection:
      "Percebi que manchete boa de compartilhar é justamente a que merece mais " +
      "desconfiança.",
  },
  {
    studentId: "a03",
    studentName: "Carla Mendes Rocha",
    status: "reflexao",
    lastAccessAt: "2026-07-16T10:41:00-03:00",
    production:
      "Vereditos: falsa, real, falsa, real. A manchete que gerei usa números " +
      "exatos (\"87% dos alunos\") para parecer pesquisa séria — é isso que a denuncia: " +
      "nenhuma pesquisa é citada.",
    reflection: null,
  },
  {
    studentId: "a04",
    studentName: "Diego Santana Alves",
    status: "entregue",
    lastAccessAt: "2026-07-16T10:35:00-03:00",
    production:
      "1: falsa — o \"jornal\" não existe. 2: real. 3: falsa — IA gerou a imagem " +
      "(mão com seis dedos). 4: real. Manchete: \"Merenda terá robô cozinheiro\".",
    reflection: null,
  },
  {
    studentId: "a05",
    studentName: "Eduarda Pacheco Nunes",
    status: "entregue",
    lastAccessAt: "2026-07-16T10:33:00-03:00",
    production:
      "Auditei as 4 manchetes com o guia de verificação: duas caem na primeira " +
      "pergunta (quem publicou?). Minha manchete falsa usa o nome da diretora " +
      "para ganhar credibilidade — e é isso que a entrega.",
    reflection: null,
  },
  {
    studentId: "a06",
    studentName: "Felipe Andrade Costa",
    status: "rascunho",
    lastAccessAt: "2026-07-16T10:40:00-03:00",
    production:
      "Veredito 1: falsa. Veredito 2: acho que é real, ainda procurando a segunda fonte…",
    reflection: null,
  },
  {
    studentId: "a07",
    studentName: "Gabriela Martins Dias",
    status: "produzindo",
    lastAccessAt: "2026-07-16T10:43:00-03:00",
    production: null,
    reflection: null,
  },
  {
    studentId: "a08",
    studentName: "Henrique Barros Teles",
    status: "investigando",
    lastAccessAt: "2026-07-16T10:39:00-03:00",
    production: null,
    reflection: null,
  },
  {
    studentId: "a09",
    studentName: "Isabela Fonseca Prado",
    status: "investigando",
    lastAccessAt: "2026-07-16T10:37:00-03:00",
    production: null,
    reflection: null,
  },
  {
    studentId: "a10",
    studentName: "João Pedro Camargo",
    status: "visualizou",
    lastAccessAt: "2026-07-16T10:29:00-03:00",
    production: null,
    reflection: null,
  },
  {
    studentId: "a11",
    studentName: "Karina Lopes Amaral",
    status: "nao_acessou",
    lastAccessAt: null,
    production: null,
    reflection: null,
  },
];

export const simulatedClassMonitor: ClassMonitorReader = {
  // A turma simulada é a mesma para qualquer Missão consultada nesta fase.
  async listByMission() {
    return turma;
  },
};
