// Nome, descrição, raridade e ícone de cada carta (spec CARTAS), resolvidos a
// partir dos textos i18n — fonte única usada pela mão de cartas e pelo
// histórico da partida (GameScreen), pra nunca dessincronizar os dois.

import { cardRarity } from '../engine';
import type { CardId, CardRarity } from '../engine';
import type { Messages } from '../i18n';
import {
  IconCardBolhaProtecao,
  IconCardBuracoNegro,
  IconCardCorrenteza,
  IconCardDevoradorDeTabuleiro,
  IconCardEstrelaDaSorte,
  IconCardSaltoEstelar,
  IconCardTempestade,
  IconCardTsunami,
} from './icons';

type NameKey = Extract<keyof Messages, `card${string}Name`>;
type DescKey = Extract<keyof Messages, `card${string}Desc`>;

const NAME_KEY: Record<CardId, NameKey> = {
  'salto-estelar': 'cardSaltoEstelarName',
  'buraco-negro': 'cardBuracoNegroName',
  'estrela-da-sorte': 'cardEstrelaDaSorteName',
  'devorador-de-tabuleiro': 'cardDevoradorDeTabuleiroName',
  'bolha-protecao': 'cardBolhaProtecaoName',
  correnteza: 'cardCorrentezaName',
  tempestade: 'cardTempestadeName',
  tsunami: 'cardTsunamiName',
};

const DESC_KEY: Record<CardId, DescKey> = {
  'salto-estelar': 'cardSaltoEstelarDesc',
  'buraco-negro': 'cardBuracoNegroDesc',
  'estrela-da-sorte': 'cardEstrelaDaSorteDesc',
  'devorador-de-tabuleiro': 'cardDevoradorDeTabuleiroDesc',
  'bolha-protecao': 'cardBolhaProtecaoDesc',
  correnteza: 'cardCorrentezaDesc',
  tempestade: 'cardTempestadeDesc',
  tsunami: 'cardTsunamiDesc',
};

export const CARD_ICON: Record<CardId, (props: { className?: string }) => JSX.Element> = {
  'salto-estelar': IconCardSaltoEstelar,
  'buraco-negro': IconCardBuracoNegro,
  'estrela-da-sorte': IconCardEstrelaDaSorte,
  'devorador-de-tabuleiro': IconCardDevoradorDeTabuleiro,
  'bolha-protecao': IconCardBolhaProtecao,
  correnteza: IconCardCorrenteza,
  tempestade: IconCardTempestade,
  tsunami: IconCardTsunami,
};

export function cardName(msgs: Messages, card: CardId): string {
  return msgs[NAME_KEY[card]];
}

export function cardDescription(msgs: Messages, card: CardId): string {
  return msgs[DESC_KEY[card]];
}

export function rarityLabel(msgs: Messages, rarity: CardRarity): string {
  return rarity === 'common' ? msgs.rarityCommon : rarity === 'rare' ? msgs.rarityRare : msgs.rarityEpic;
}

export function cardRarityLabel(msgs: Messages, card: CardId): string {
  return rarityLabel(msgs, cardRarity(card));
}
