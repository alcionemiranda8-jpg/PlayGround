/* Dados estáticos da Liga Brasil */
const PLAYER_ID = 'verde';
const SAVE_KEY = 'liga-brasil-save-v3';
const DIV_ORDER = ['A', 'B', 'C', 'D'];
const DIV_NAME = {
  A: 'Brasileirão Série A',
  B: 'Brasileirão Série B',
  C: 'Brasileirão Série C',
  D: 'Brasileirão Série D'
};
const DIV_SHORT = { A: 'Série A', B: 'Série B', C: 'Série C', D: 'Série D' };
const KO_NAMES = ['Oitavas de final', 'Quartas de final', 'Semifinais', 'Final'];
const POS_ORDER = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'PON', 'ATA'];

function slug(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function club(name, short, strength, color) {
  return { id: slug(name), name, short, strength, color };
}

const PLAYER_CLUB = {
  id: PLAYER_ID, name: 'Verde FC', short: 'VFC', strength: 70,
  color: '#2f9e5f', isPlayer: true
};

const A_CLUBS = [
  club('Flamengo', 'FLA', 88, '#c62828'),
  club('Palmeiras', 'PAL', 87, '#006437'),
  club('Botafogo', 'BOT', 86, '#1c1c1c'),
  club('Atlético Mineiro', 'CAM', 85, '#262626'),
  club('Cruzeiro', 'CRU', 84, '#1d3f91'),
  club('Fluminense', 'FLU', 83, '#7a1f2b'),
  club('São Paulo', 'SAO', 83, '#c62828'),
  club('Internacional', 'INT', 82, '#b71c1c'),
  club('Corinthians', 'COR', 82, '#1c1c1c'),
  club('Grêmio', 'GRE', 82, '#1565a8'),
  club('Bahia', 'BAH', 81, '#0d47a1'),
  club('Bragantino', 'RBB', 81, '#c62828'),
  club('Santos', 'SAN', 80, '#f4f4f4'),
  club('Fortaleza', 'FOR', 79, '#1a4f9c'),
  club('Vasco', 'VAS', 78, '#1c1c1c'),
  club('Vitória', 'VIT', 77, '#c62828'),
  club('Atlético Goianiense', 'AGO', 76, '#c62828'),
  club('Ceará', 'CEA', 75, '#1c1c1c'),
  club('Juventude', 'JUV', 74, '#0a7d3b'),
  club('Sport', 'SPT', 73, '#c62828')
];

const B_CLUBS = [
  club('Leão do Norte', 'LNO', 74, '#c62828'),
  club('Vila Forte', 'VFO', 72, '#1565a8'),
  club('Atlético Raiz', 'ARA', 73, '#1c1c1c'),
  club('Navegantes', 'NAV', 71, '#0d47a1'),
  club('Clube do Vale', 'CVA', 75, '#2e7d32'),
  club('Oeste Verde', 'OVE', 70, '#00695c'),
  club('Dragão Azul', 'DAL', 74, '#1565a8'),
  club('Santa União', 'SUN', 69, '#b71c1c'),
  club('Cruz do Sul', 'CDS', 72, '#283593'),
  club('Aurora FC', 'AFC', 71, '#ef6c00'),
  club('Caçadores', 'CAC', 73, '#4e342e'),
  club('Forte Real', 'FTR', 70, '#6a1b9a'),
  club('Rio Capital', 'RCA', 74, '#0277bd'),
  club('Jangada', 'JAN', 68, '#00838f'),
  club('Vitória Urbana', 'VUR', 72, '#c62828'),
  club('Alvorada', 'ALV', 69, '#f9a825'),
  club('Pioneiros', 'PIO', 71, '#5d4037'),
  club('União Mineira', 'UMI', 73, '#37474f'),
  club('Lago Azul', 'LAZ', 70, '#1565c0'),
  club('Bravos FC', 'BFC', 68, '#263238')
];

const C_CLUBS = [
  club('Serra Negra', 'SNG', 70, '#37474f'),
  club('Atlética Brasil', 'ABR', 69, '#2e7d32'),
  club('Porto Clube', 'POR', 68, '#1565a8'),
  club('Rio Branco', 'RBR', 67, '#1c1c1c'),
  club('Esporte União', 'EUN', 71, '#c62828'),
  club('Figueira Azul', 'FAZ', 68, '#0d47a1'),
  club('Norte Atlético', 'NAT', 66, '#00695c'),
  club('Cavalos FC', 'CVF', 69, '#6d4c41'),
  club('Mar Azul', 'MAZ', 67, '#0277bd'),
  club('São Jorge', 'SJO', 70, '#b71c1c'),
  club('Vila Nova Sul', 'VNS', 65, '#2e7d32'),
  club('Diamante SC', 'DSC', 64, '#455a64'),
  club('Corunha FC', 'COF', 68, '#1565a8'),
  club('Tricolor Oeste', 'TRO', 66, '#283593'),
  club('Litoral FC', 'LTF', 69, '#00838f'),
  club('Cruz Alta', 'CAL', 67, '#c62828'),
  club('Ponte Nova', 'PNO', 65, '#ef6c00'),
  club('Estrela da Serra', 'EDS', 71, '#f9a825'),
  club('Minerais FC', 'MFC', 64, '#4e342e'),
  club('Central Esporte', 'CES', 66, '#37474f')
];

/* 64 clubes da Série D — o primeiro é o clube do jogador. */
const D_CLUBS = [
  PLAYER_CLUB,
  club('União Acreana', 'UAC', 64, '#c62828'),
  club('Rubro Norte', 'RNO', 66, '#b71c1c'),
  club('Aurora SC', 'ASC', 63, '#ef6c00'),
  club('Atlético Sul', 'ASU', 67, '#1565a8'),
  club('Praia FC', 'PFC', 65, '#00838f'),
  club('Capital', 'CAP', 68, '#37474f'),
  club('Imperial', 'IMP', 66, '#6a1b9a'),
  club('Ferroviário Oeste', 'FVO', 61, '#4e342e'),
  club('Serra Azul', 'SAZ', 60, '#0277bd'),
  club('Porto Real', 'PRE', 62, '#1565a8'),
  club('Vale Esportivo', 'VES', 59, '#2e7d32'),
  club('Nação Central', 'NCN', 64, '#c62828'),
  club('Costa Verde', 'CVE', 61, '#00695c'),
  club('Bandeirantes', 'BAN', 63, '#ef6c00'),
  club('Santa Cruz FC', 'SCF', 58, '#b71c1c'),
  club('Juventude Norte', 'JUN', 60, '#0a7d3b'),
  club('Leões do Leste', 'LLS', 62, '#f9a825'),
  club('Arena Nacional', 'ANA', 57, '#455a64'),
  club('Desporto Sul', 'DSU', 59, '#1565a8'),
  club('Serra do Mar', 'SDM', 62, '#37474f'),
  club('Vale do Aço', 'VAC', 61, '#4e342e'),
  club('Rio Claro', 'RCL', 60, '#0277bd'),
  club('Costa do Sol', 'CSL', 63, '#f9a825'),
  club('Ilha Grande', 'ILG', 59, '#00838f'),
  club('Campo Verde', 'CPV', 62, '#2e7d32'),
  club('Nova Aurora', 'NVA', 61, '#ef6c00'),
  club('Boa Vista', 'BVS', 60, '#00695c'),
  club('Monte Alto', 'MTA', 61, '#5d4037'),
  club('Águia FC', 'AGU', 64, '#c62828'),
  club('Falcões FC', 'FAL', 63, '#37474f'),
  club('Tigres do Sul', 'TGS', 62, '#ef6c00'),
  club('Pantera FC', 'PAN', 60, '#1c1c1c'),
  club('Leopardo FC', 'LEO', 61, '#f9a825'),
  club('Jaguar FC', 'JAG', 59, '#4e342e'),
  club('Grêmio Litoral', 'GRL', 62, '#1565a8'),
  club('União do Vale', 'UDV', 63, '#2e7d32'),
  club('Esportivo Central', 'ECT', 60, '#455a64'),
  club('Real Serrano', 'RSR', 61, '#6a1b9a'),
  club('Nacional da Serra', 'NDS', 64, '#283593'),
  club('Porto das Dunas', 'PDD', 58, '#00838f'),
  club('Estrela do Mar', 'EDM', 62, '#0277bd'),
  club('Sol Nascente', 'SNS', 61, '#f9a825'),
  club('Lua Cheia', 'LCH', 59, '#5e35b1'),
  club('Horizonte FC', 'HOR', 63, '#1565a8'),
  club('Planalto FC', 'PLA', 60, '#2e7d32'),
  club('Cerrado FC', 'CER', 62, '#6d4c41'),
  club('Pantanal FC', 'PNT', 61, '#00838f'),
  club('Amazônia FC', 'AMZ', 60, '#00695c'),
  club('Rio Negro', 'RNG', 63, '#1c1c1c'),
  club('Atlântico FC', 'ATL', 62, '#0d47a1'),
  club('Marítimo FC', 'MRT', 59, '#0277bd'),
  club('Oceânico FC', 'OCE', 61, '#00838f'),
  club('Continental FC', 'CTN', 60, '#37474f'),
  club('Interlagos FC', 'ITL', 64, '#c62828'),
  club('Autódromo FC', 'AUT', 58, '#455a64'),
  club('Metropolitano', 'MET', 63, '#283593'),
  club('Urbano FC', 'URB', 61, '#5d4037'),
  club('Suburbano FC', 'SUB', 59, '#6d4c41'),
  club('Parque FC', 'PRQ', 60, '#2e7d32'),
  club('Jardim FC', 'JAR', 58, '#00838f'),
  club('Vila FC', 'VIL', 62, '#ef6c00'),
  club('Bairro FC', 'BAI', 57, '#546e7a'),
  club('Comunidade FC', 'COM', 58, '#4e342e')
];

const INITIAL_SQUAD = [
  { name: 'Rafael Silva', pos: 'GOL', overall: 74, age: 29, number: 1 },
  { name: 'Diego Nunes', pos: 'GOL', overall: 67, age: 23, number: 12 },
  { name: 'Caio Mendes', pos: 'ZAG', overall: 73, age: 27, number: 3 },
  { name: 'Léo Martins', pos: 'ZAG', overall: 72, age: 25, number: 4 },
  { name: 'Vitor Hugo', pos: 'ZAG', overall: 69, age: 22, number: 14 },
  { name: 'André Costa', pos: 'ZAG', overall: 67, age: 20, number: 22 },
  { name: 'Thiago Lima', pos: 'LAT', overall: 71, age: 26, number: 2 },
  { name: 'Igor Prado', pos: 'LAT', overall: 68, age: 23, number: 6 },
  { name: 'Bruno Alves', pos: 'VOL', overall: 74, age: 28, number: 5 },
  { name: 'Samuel Reis', pos: 'VOL', overall: 69, age: 22, number: 15 },
  { name: 'Pedro Costa', pos: 'MEI', overall: 76, age: 24, number: 8 },
  { name: 'Mateus Rocha', pos: 'MEI', overall: 74, age: 27, number: 10 },
  { name: 'Lucas Freitas', pos: 'MEI', overall: 70, age: 21, number: 18 },
  { name: 'Daniel Reis', pos: 'PON', overall: 73, age: 25, number: 7 },
  { name: 'Gabriel Paz', pos: 'PON', overall: 71, age: 23, number: 11 },
  { name: 'Enzo Souza', pos: 'ATA', overall: 77, age: 26, number: 9 },
  { name: 'Nicolas Melo', pos: 'ATA', overall: 73, age: 24, number: 19 },
  { name: 'João Vitor', pos: 'ATA', overall: 68, age: 20, number: 20 }
];

const FIRST_NAMES = ['Lucas', 'Gabriel', 'Matheus', 'Rafael', 'Bruno', 'Felipe', 'Diego', 'Thiago', 'João', 'Pedro', 'Caio', 'Vitor', 'Eduardo', 'Henrique', 'Murilo', 'Igor', 'Samuel', 'Arthur', 'Davi', 'Breno'];
const LAST_NAMES = ['Silva', 'Costa', 'Rocha', 'Lima', 'Souza', 'Almeida', 'Pereira', 'Santos', 'Oliveira', 'Ferreira', 'Gomes', 'Martins', 'Barbosa', 'Ribeiro', 'Carvalho', 'Araújo', 'Nascimento', 'Moraes', 'Cardoso', 'Teixeira'];
