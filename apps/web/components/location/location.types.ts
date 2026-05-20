export type LocationValue = {
  address: string;
  province: string;
  city: string;
  lat: number | null;
  lng: number | null;
  placeId?: string | null;
};

export type ProvinceOption = {
  value: string;
  label: string;
  cities: {
    value: string;
    label: string;
  }[];
};

export type LocationPickerMapProps = {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
  disabled?: boolean;
  required?: boolean;
  label?: string;
  helperText?: string;
  error?: string;
};

export type ProvinceCitySelectProps = {
  province: string;
  city: string;
  onProvinceChange: (province: string) => void;
  onCityChange: (city: string) => void;
  disabled?: boolean;
  required?: boolean;
  provinceError?: string;
  cityError?: string;
};

export const EMPTY_LOCATION_VALUE: LocationValue = {
  address: '',
  province: '',
  city: '',
  lat: null,
  lng: null,
  placeId: null,
};
