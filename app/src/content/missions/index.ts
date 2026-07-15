import type { Mission } from "@/modules/library";

import { missionAFabricaDeNoticias } from "./01-a-fabrica-de-noticias";

/**
 * Índice de conteúdo das Missões do IAH.
 *
 * Para adicionar uma nova Missão: crie um arquivo de conteúdo nesta pasta
 * (seguindo docs/MISSION_TEMPLATE.md) e registre-o neste array. Nenhum
 * componente de interface precisa mudar. A ordem final de exibição é
 * resolvida pelo repositório (por módulo e por `order`).
 */
export const missions: Mission[] = [missionAFabricaDeNoticias];
