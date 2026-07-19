import type { Peak } from './schemas';

export const RANGE_EDITION_IDS = [
  'uk',
  'scotland',
  'cairngorms',
  'wainwrights',
  'wales',
  'peak-district',
  'yorkshire-dales',
  'pennines',
  'northern-ireland',
  'south-west',
  'isle-of-man',
] as const;

export type RangeEditionId = (typeof RANGE_EDITION_IDS)[number];
export type EditionBounds = [[number, number], [number, number]];

export interface RangeEditionSummary {
  id: RangeEditionId;
  name: string;
  identity: string;
  descriptor: string;
  peakNoun: string;
}

export interface RangeEditionView extends RangeEditionSummary {
  key: string;
  peaks: Peak[];
  bounds: EditionBounds;
  initialView: {
    longitude: number;
    latitude: number;
    zoom: number;
    bearing: number;
    pitch: number;
  };
}

type EditionDefinition = RangeEditionSummary & {
  includes: (peak: Peak) => boolean;
};

const SCOTLAND_REGIONS = new Set([
  'Altnaharra to Dornoch',
  'Applecross to Achnasheen',
  'Arran and Holy Island',
  'Ayr to the River Clyde',
  'Barra to Barra Head',
  'Braemar to Montrose',
  'Cairngorms',
  'Canna, Rhum and Eigg',
  'Cape Wrath Peninsula',
  'Carrick and Galloway',
  'Carsphairn Hills',
  'Central Scotland from Dumbarton to Montrose',
  'Coll and Tiree',
  'Culter Hills and Tinto',
  'Durness to Loch Shin',
  'Ettrick Hills',
  'Firth of Forth to the River Tweed',
  'Fort William to Loch Treig & Loch Leven',
  'Fraserburgh to the Dee Valley',
  'Galloway Hills',
  'Glen Affric to Glen Moriston',
  'Glen Albyn and the Monadh Liath',
  'Glen Artney Hills',
  'Glen Etive to Glen Lochy',
  'Glen Lyon to Glen Dochart & Loch Tay',
  'Glen Shiel to Loch Hourn and Loch Quoich',
  'Glen Tromie to Glen Tilt',
  'Harris and Nearby Islands',
  'Inveraray to Crianlarich',
  'Inverness to Strathspey',
  'Islay',
  'Jura, Scarba and Colonsay',
  'Killilan to Inverness',
  'Knapdale and Kintyre',
  'Knoydart to Glen Kingie',
  'Kyle of Lochalsh to Garve',
  'Lewis and Nearby Islands',
  'Loch Arkaig to Glen Moriston',
  'Loch Broom to Strath Oykel',
  'Loch Duich to Cannich',
  'Loch Ericht to Glen Tromie & Glen Garry',
  'Loch Fyne to Bute and the Firth of Clyde',
  'Loch Leven to Rannoch Station',
  'Loch Linnhe to Loch Etive',
  'Loch Lochy to Loch Laggan',
  'Loch Lomond to Strathyre',
  'Loch Long to Loch Lomond',
  'Loch Maree to Loch Broom',
  'Loch Rannoch to Glen Lyon',
  'Loch Tay to Perth',
  'Loch Torridon to Loch Maree',
  'Loch Treig to Loch Ericht',
  'Loch Vaich to Moray Firth',
  'Lochinver to Ullapool',
  'Lowther Hills',
  'Mallaig to Fort William',
  'Manor Hills',
  'Minginish and the Cuillin Hills',
  'Moffat Hills',
  'Moidart and Ardnamurchan',
  'Moorfoot Hills',
  'Morvern and Kingairloch',
  'Mull and Nearby Islands',
  'North Skye and Raasay',
  'North Uist, South Uist and Nearby Islands',
  'Oban to Loch Fyne',
  'Ochil Hills',
  'Orkney Islands',
  'Pitlochry to Braemar & Blairgowrie',
  'Roxburgh',
  'Scourie to Lairg',
  'Shetland Islands',
  'South-East Skye and Scalpay',
  'St Kilda',
  'Strathyre to Strathallan',
  'Sunart and Ardgour',
  'The Fannaichs',
  'The Glenkens to Annandale',
  'The River Tweed to the English Border',
  'Tomintoul to Banff',
  'Tongue to Wick and Helmsdale',
]);

const WALES_REGIONS = new Set([
  'Aberystwyth to Welshpool',
  'Anglesey and the Lleyn Peninsula',
  'Bala to Welshpool',
  'Black Mountains',
  'Brecon Beacons',
  'Cadair Idris',
  'Carmarthen to Vale of Neath',
  'Central Wales - Elan Valley',
  'Central Wales - Pumlumon',
  'Central Wales - Radnor Forest',
  'Llandovery to Monmouth',
  'Llandudno to Wrexham',
  'Moel Hebog',
  'Neath to Chepstow',
  'Snowdon',
  'South-West Wales',
  'The Arans',
  'The Arenigs',
  'The Berwyns',
  'The Carneddau',
  'The Glyders',
  'The Moelwyns',
  'The Rhinogs',
  'Welsh Borders S',
  'Welshpool to Hay-on-Wye',
]);

const NORTHERN_IRELAND_REGIONS = new Set([
  'Antrim Mountains',
  'County Armagh',
  'Londonderry and N Tyrone',
  'Mourne Mountains',
  'Sperrin Mountains',
]);

const EDITIONS: readonly EditionDefinition[] = [
  {
    id: 'uk',
    name: 'United Kingdom',
    identity: 'Munro',
    descriptor: 'Every supported hill, one national atlas',
    peakNoun: 'peaks',
    includes: () => true,
  },
  {
    id: 'scotland',
    name: 'Scotland',
    identity: 'Scotland',
    descriptor: 'Highlands, islands and Southern Uplands',
    peakNoun: 'hills',
    includes: (peak) => SCOTLAND_REGIONS.has(peak.region),
  },
  {
    id: 'cairngorms',
    name: 'Cairngorms',
    identity: 'Cairngorms',
    descriptor: 'The complete Cairngorm plateau and outlying massifs',
    peakNoun: 'hills',
    includes: (peak) => peak.region === 'Cairngorms',
  },
  {
    id: 'wainwrights',
    name: 'Wainwrights',
    identity: 'Wainwrights',
    descriptor: 'The 214 fells and every Outlying Fell',
    peakNoun: 'fells',
    includes: (peak) =>
      peak.list.includes('wainwrights') ||
      peak.list.includes('wainwright-outlying-fells'),
  },
  {
    id: 'wales',
    name: 'Wales',
    identity: 'Wales',
    descriptor: 'Eryri, the Cambrians and Bannau Brycheiniog',
    peakNoun: 'hills',
    includes: (peak) => WALES_REGIONS.has(peak.region),
  },
  {
    id: 'peak-district',
    name: 'Peak District',
    identity: 'Peak District',
    descriptor: 'The complete Dark Peak and White Peak frame',
    peakNoun: 'hills',
    includes: (peak) => peak.region === 'The Peak District',
  },
  {
    id: 'yorkshire-dales',
    name: 'Yorkshire Dales',
    identity: 'Yorkshire Dales',
    descriptor: 'Northern and Southern Fells together',
    peakNoun: 'hills',
    includes: (peak) => peak.region.startsWith('Yorkshire Dales - '),
  },
  {
    id: 'pennines',
    name: 'Pennines',
    identity: 'Pennines',
    descriptor: 'North Pennines and the southern chain',
    peakNoun: 'hills',
    includes: (peak) =>
      peak.region.startsWith('North Pennines') ||
      peak.region === 'Lancashire, Cheshire and S Pennines',
  },
  {
    id: 'northern-ireland',
    name: 'Northern Ireland',
    identity: 'Northern Ireland',
    descriptor: 'Mournes, Sperrins, Antrim and Armagh',
    peakNoun: 'hills',
    includes: (peak) => NORTHERN_IRELAND_REGIONS.has(peak.region),
  },
  {
    id: 'south-west',
    name: 'South West',
    identity: 'South West',
    descriptor: 'Dartmoor and the peninsula',
    peakNoun: 'hills',
    includes: (peak) =>
      peak.region === 'Dartmoor' || peak.region === 'South West England',
  },
  {
    id: 'isle-of-man',
    name: 'Isle of Man',
    identity: 'Isle of Man',
    descriptor: 'The island ridge in one complete frame',
    peakNoun: 'hills',
    includes: (peak) => peak.region === 'Isle of Man',
  },
];

export const RANGE_EDITIONS: readonly RangeEditionSummary[] = EDITIONS.map(
  (edition) => ({
    id: edition.id,
    name: edition.name,
    identity: edition.identity,
    descriptor: edition.descriptor,
    peakNoun: edition.peakNoun,
  }),
);

export function isRangeEditionId(value: unknown): value is RangeEditionId {
  return (
    typeof value === 'string' &&
    RANGE_EDITION_IDS.some((editionId) => editionId === value)
  );
}

export function buildRangeEdition(
  editionId: RangeEditionId,
  allPeaks: Peak[],
): RangeEditionView {
  const definition =
    EDITIONS.find((edition) => edition.id === editionId) ?? EDITIONS[0];

  if (!definition) throw new Error('The range edition registry is empty');

  const peaks = allPeaks.filter(definition.includes);
  const bounds = boundsForPeaks(peaks);
  const [[west, south], [east, north]] = bounds;

  return {
    id: definition.id,
    key: `range:${definition.id}`,
    name: definition.name,
    identity: definition.identity,
    descriptor: definition.descriptor,
    peakNoun: definition.peakNoun,
    peaks,
    bounds,
    initialView: {
      longitude: (west + east) / 2,
      latitude: (south + north) / 2,
      zoom: definition.id === 'uk' ? 5 : 7,
      bearing: -12,
      pitch: 38,
    },
  };
}

export function boundsForPeaks(peaks: Peak[]): EditionBounds {
  if (peaks.length === 0) {
    return [
      [-8.9, 49.95],
      [1.6, 61],
    ];
  }

  let west = peaks[0]?.lon ?? 0;
  let east = west;
  let south = peaks[0]?.lat ?? 0;
  let north = south;

  for (const peak of peaks.slice(1)) {
    west = Math.min(west, peak.lon);
    east = Math.max(east, peak.lon);
    south = Math.min(south, peak.lat);
    north = Math.max(north, peak.lat);
  }

  const longitudePadding = Math.max(0.06, (east - west) * 0.08);
  const latitudePadding = Math.max(0.04, (north - south) * 0.08);

  return [
    [west - longitudePadding, south - latitudePadding],
    [east + longitudePadding, north + latitudePadding],
  ];
}
