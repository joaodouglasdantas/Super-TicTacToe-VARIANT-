// Motor do Super TicTacToe. TypeScript puro, sem dependência de UI (REQ-STT-01).

export type Player = 'X' | 'O';

// Resultado de um tabuleiro (ou célula): indefinido enquanto null.
export type Result = Player | 'draw' | null;

// Mapa sorteado por partida (spec MAPAS). Deixou de ser só cosmético quando a
// spec CARTAS deu a cada mapa seu próprio baralho — por isso mora aqui, não
// em src/theme/ (que agora importa daqui, não o contrário).
export type MapTheme = 'galaxy' | 'beach';

// Cartas de evento por mapa (spec CARTAS). Um só enum pros dois baralhos:
// nenhuma partida usa cartas de um mapa que não é o dela (RN-CARTAS-07), mas
// não custa nada não ter dois tipos paralelos.
export type CardId =
  | 'salto-estelar'
  | 'buraco-negro'
  | 'estrela-da-sorte'
  | 'devorador-de-tabuleiro'
  | 'bolha-protecao'
  | 'correnteza'
  | 'tempestade'
  | 'tsunami';

export type CardRarity = 'common' | 'rare' | 'epic';

// Tabuleiro recursivo: depth 1 tem células simples; depth N tem tabuleiros de depth N-1.
// lockedUntilAction/protectedUntilAction (spec CARTAS, RN-CARTAS-02/03/04) só
// têm efeito prático em tabuleiro de profundidade 1 (o "tabuleiro pequeno"
// que as cartas miram), mas o campo existe no tipo recursivo inteiro por
// simplicidade — não custa nada ficar sempre undefined nos níveis acima.
export interface Board {
  depth: number;
  cells: (Board | Player | null)[];
  lockedUntilAction?: number;
  protectedUntilAction?: number;
  protectedBy?: Player;
}

// Caminho até uma célula: um índice 0..8 por nível, do topo até a folha (length === depth).
// Cartas que miram um tabuleiro (não uma célula) usam um Path mais curto,
// apontando pro tabuleiro em vez de uma célula dentro dele.
export type Path = number[];

// RN-STT-05: critério de desempate quando um tabuleiro de tabuleiros enche sem linha.
export type Tiebreak = 'majority' | 'neutral' | 'both';

// REQ-STT-03 / RN-STT-08: configuração definida na criação e imutável durante a partida.
export interface GameConfig {
  depth: number; // 2 = Super TicTacToe clássico
  clearVariant: boolean; // RN-STT-04
  tiebreak: Tiebreak; // RN-STT-05
  startingPlayer: Player; // RN-STT-06
  map: MapTheme; // RN-MAPAS-03: sorteado por quem cria a partida, nunca escolhido
}

// Uma jogada normal tem só player+path. Uma jogada de carta (spec CARTAS)
// marca `card` e reaproveita path/path2/cellIndex com um significado
// diferente por carta — ver src/engine/cards.ts (`describeCardTarget`) pra a
// tabela completa de como cada carta interpreta esses campos.
export interface Move {
  player: Player;
  path: Path;
  card?: CardId;
  path2?: Path;
  cellIndex?: number;
}

// Mão de cartas de cada jogador (REQ-CARTAS-04, 05): estado derivado, não
// guardado à parte — reconstruído a cada applyMove/applyCard a partir da mão
// anterior, então replay/undo/retomada acertam a mão de graça, sem código
// especial (ver Notas Técnicas de .specs/CARTAS/spec.md).
export type Hands = Record<Player, CardId[]>;

export interface GameState {
  config: Readonly<GameConfig>;
  board: Board;
  currentPlayer: Player;
  moves: Move[];
  // Prefixo obrigatório do próximo caminho (RN-STT-01), ou null se a jogada é livre (RN-STT-02).
  // "Tempestade" (spec CARTAS) escreve aqui diretamente pra redirecionar a
  // próxima jogada do adversário — mesmo mecanismo, só a origem do valor muda.
  forcedPath: Path | null;
  result: Result;
  hands: Hands;
  // Ações totais já aplicadas (jogadas + cartas): usado como semente do
  // sorteio de carta (determinístico, sincroniza sozinho no online — RN-MAPAS-03
  // e REQ-CARTAS-11) e como relógio pra bloqueio/proteção (RN-CARTAS-04).
  actionCount: number;
}

// Forma serializada mínima e reconstituível (REQ-STT-14): config + jogadas.
export interface SerializedGame {
  config: GameConfig;
  moves: Move[];
}
