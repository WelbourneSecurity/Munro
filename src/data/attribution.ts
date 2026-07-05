export const DOBIH_ATTRIBUTION = {
  label: 'Hill data: Database of British and Irish Hills v18.4, CC BY 4.0',
  url: 'https://www.hill-bagging.co.uk/dobih',
} as const;

export const BOUNDARY_ATTRIBUTION = {
  label:
    'Boundary: © Natural England copyright. Contains Ordnance Survey data © Crown copyright and database right 2026. Licensed under OGL v3.',
  url: 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/',
} as const;

export const BASEMAP_ATTRIBUTION = {
  label: 'OpenFreeMap © OpenMapTiles, Data from OpenStreetMap',
  url: 'https://openfreemap.org/',
} as const;

export const TERRAIN_ATTRIBUTION = {
  label:
    'Terrain: AWS Terrain Tiles derived from Mapzen terrain sources, public elevation tile service',
  url: 'https://registry.opendata.aws/terrain-tiles/',
} as const;

export const ATTRIBUTIONS = [
  DOBIH_ATTRIBUTION,
  BOUNDARY_ATTRIBUTION,
  BASEMAP_ATTRIBUTION,
  TERRAIN_ATTRIBUTION,
] as const;

export function mapAttributionHtml() {
  return [
    BASEMAP_ATTRIBUTION,
    TERRAIN_ATTRIBUTION,
    BOUNDARY_ATTRIBUTION,
    DOBIH_ATTRIBUTION,
  ]
    .map((attribution) => `<a href="${attribution.url}">${attribution.label}</a>`)
    .join(' | ');
}
