import React from 'react';
import Select from 'react-select';

export interface SearchableSelectOption {
  value: string | number;
  label: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value?: string | number | null;
  onChange: (value: string | number | null) => void;
  placeholder?: string;
  isDisabled?: boolean;
  isClearable?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Selecciona una opción',
  isDisabled = false,
  isClearable = true,
}) => {
  const selectedOption = options.find((option) => option.value === value) ?? null;

  return (
    <Select
      options={options}
      value={selectedOption}
      onChange={(option) => onChange(option?.value ?? null)}
      placeholder={placeholder}
      isDisabled={isDisabled}
      isClearable={isClearable}
      isSearchable
      classNamePrefix="rs"
      noOptionsMessage={() => 'Sin resultados'}
      styles={{
        control: (base, state) => ({
          ...base,
          minHeight: 44,
          borderRadius: 12,
          borderColor: state.isFocused ? 'hsl(var(--p))' : base.borderColor,
          boxShadow: state.isFocused ? '0 0 0 1px hsl(var(--p))' : 'none',
          backgroundColor: 'hsl(var(--b1))',
        }),
        valueContainer: (base) => ({
          ...base,
          paddingLeft: 10,
          paddingRight: 10,
        }),
        menu: (base) => ({
          ...base,
          zIndex: 30,
        }),
      }}
    />
  );
};

export default SearchableSelect;
