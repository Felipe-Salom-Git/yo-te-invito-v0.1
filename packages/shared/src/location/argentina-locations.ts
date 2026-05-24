import type { ProvinceOption } from './types';

/** Normalized Argentina provinces and main cities/localities for form selects. */
export const ARGENTINA_PROVINCES: ProvinceOption[] = [
  {
    value: 'ciudad-autonoma-buenos-aires',
    label: 'Ciudad Autónoma de Buenos Aires',
    cities: [{ value: 'caba', label: 'CABA' }],
  },
  {
    value: 'buenos-aires',
    label: 'Buenos Aires',
    cities: [
      { value: 'la-plata', label: 'La Plata' },
      { value: 'mar-del-plata', label: 'Mar del Plata' },
      { value: 'tandil', label: 'Tandil' },
      { value: 'pinamar', label: 'Pinamar' },
    ],
  },
  {
    value: 'rio-negro',
    label: 'Río Negro',
    cities: [
      { value: 'san-carlos-de-bariloche', label: 'San Carlos de Bariloche' },
      { value: 'villa-la-angostura', label: 'Villa La Angostura' },
      { value: 'el-bolson', label: 'El Bolsón' },
      { value: 'viedma', label: 'Viedma' },
      { value: 'san-antonio-oeste', label: 'San Antonio Oeste' },
    ],
  },
  {
    value: 'neuquen',
    label: 'Neuquén',
    cities: [
      { value: 'neuquen-capital', label: 'Neuquén (capital)' },
      { value: 'san-martin-de-los-andes', label: 'San Martín de los Andes' },
      { value: 'villa-la-angostura-neuquen', label: 'Villa La Angostura' },
      { value: 'junin-de-los-andes', label: 'Junín de los Andes' },
      { value: 'aluminue', label: 'Aluminé' },
    ],
  },
  {
    value: 'chubut',
    label: 'Chubut',
    cities: [
      { value: 'puerto-madryn', label: 'Puerto Madryn' },
      { value: 'trelew', label: 'Trelew' },
      { value: 'comodoro-rivadavia', label: 'Comodoro Rivadavia' },
      { value: 'esquel', label: 'Esquel' },
      { value: 'rawson', label: 'Rawson' },
    ],
  },
  {
    value: 'santa-cruz',
    label: 'Santa Cruz',
    cities: [
      { value: 'el-calafate', label: 'El Calafate' },
      { value: 'el-chalten', label: 'El Chaltén' },
      { value: 'rio-gallegos', label: 'Río Gallegos' },
      { value: 'puerto-deseado', label: 'Puerto Deseado' },
    ],
  },
  {
    value: 'cordoba',
    label: 'Córdoba',
    cities: [
      { value: 'cordoba-capital', label: 'Córdoba (capital)' },
      { value: 'villa-carlos-paz', label: 'Villa Carlos Paz' },
      { value: 'alta-gracia', label: 'Alta Gracia' },
    ],
  },
  {
    value: 'mendoza',
    label: 'Mendoza',
    cities: [
      { value: 'mendoza-capital', label: 'Mendoza (capital)' },
      { value: 'san-rafael', label: 'San Rafael' },
      { value: 'malargue', label: 'Malargüe' },
    ],
  },
  {
    value: 'salta',
    label: 'Salta',
    cities: [
      { value: 'salta-capital', label: 'Salta (capital)' },
      { value: 'cafayate', label: 'Cafayate' },
      { value: 'san-lorenzo-salta', label: 'San Lorenzo' },
    ],
  },
  {
    value: 'jujuy',
    label: 'Jujuy',
    cities: [
      { value: 'san-salvador-de-jujuy', label: 'San Salvador de Jujuy' },
      { value: 'tilcara', label: 'Tilcara' },
      { value: 'purmamarca', label: 'Purmamarca' },
    ],
  },
  {
    value: 'tucuman',
    label: 'Tucumán',
    cities: [{ value: 'san-miguel-de-tucuman', label: 'San Miguel de Tucumán' }],
  },
  {
    value: 'entre-rios',
    label: 'Entre Ríos',
    cities: [
      { value: 'parana', label: 'Paraná' },
      { value: 'concordia', label: 'Concordia' },
      { value: 'colon', label: 'Colón' },
    ],
  },
  {
    value: 'corrientes',
    label: 'Corrientes',
    cities: [
      { value: 'corrientes-capital', label: 'Corrientes (capital)' },
      { value: 'puerto-iguazu', label: 'Puerto Iguazú' },
    ],
  },
  {
    value: 'misiones',
    label: 'Misiones',
    cities: [
      { value: 'posadas', label: 'Posadas' },
      { value: 'puerto-iguazu-misiones', label: 'Puerto Iguazú' },
      { value: 'obera', label: 'Oberá' },
    ],
  },
  {
    value: 'san-juan',
    label: 'San Juan',
    cities: [{ value: 'san-juan-capital', label: 'San Juan (capital)' }],
  },
  {
    value: 'san-luis',
    label: 'San Luis',
    cities: [
      { value: 'san-luis-capital', label: 'San Luis (capital)' },
      { value: 'villa-merlo', label: 'Villa de Merlo' },
    ],
  },
  {
    value: 'la-rioja',
    label: 'La Rioja',
    cities: [{ value: 'la-rioja-capital', label: 'La Rioja (capital)' }],
  },
  {
    value: 'catamarca',
    label: 'Catamarca',
    cities: [{ value: 'san-fernando-del-valle', label: 'San Fernando del Valle de Catamarca' }],
  },
  {
    value: 'santiago-del-estero',
    label: 'Santiago del Estero',
    cities: [{ value: 'santiago-del-estero-capital', label: 'Santiago del Estero (capital)' }],
  },
  {
    value: 'chaco',
    label: 'Chaco',
    cities: [{ value: 'resistencia', label: 'Resistencia' }],
  },
  {
    value: 'formosa',
    label: 'Formosa',
    cities: [{ value: 'formosa-capital', label: 'Formosa (capital)' }],
  },
  {
    value: 'la-pampa',
    label: 'La Pampa',
    cities: [
      { value: 'santa-rosa', label: 'Santa Rosa' },
      { value: 'general-pico', label: 'General Pico' },
    ],
  },
  {
    value: 'tierra-del-fuego',
    label: 'Tierra del Fuego',
    cities: [
      { value: 'ushuaia', label: 'Ushuaia' },
      { value: 'rio-grande', label: 'Río Grande' },
    ],
  },
];
