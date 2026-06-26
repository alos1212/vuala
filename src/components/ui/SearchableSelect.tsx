import React from 'react';
import Select from 'react-select';

export interface SearchableSelectOption {
  value: string | number;
  label: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value?: string | number | Array<string | number> | null;
  onChange: (value: string | number | Array<string | number> | null) => void;
  placeholder?: string;
  isDisabled?: boolean;
  isClearable?: boolean;
  inputValue?: string;
  onInputChange?: (value: string) => void;
  isLoading?: boolean;
  isMulti?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Selecciona una opción',
  isDisabled = false,
  isClearable = true,
  inputValue,
  onInputChange,
  isLoading = false,
  isMulti = false,
}) => {
  const selectedOption = isMulti
    ? options.filter((option) => Array.isArray(value) && value.includes(option.value))
    : options.find((option) => option.value === value) ?? null;

  return (
    <Select
      options={options}
      value={selectedOption}
      onChange={(option) => {
        if (isMulti) {
          const selected = Array.isArray(option) ? option.map((entry) => entry.value) : [];
          onChange(selected);

          return;
        }

        onChange((option as SearchableSelectOption | null)?.value ?? null);
      }}
      placeholder={placeholder}
      isDisabled={isDisabled}
      isClearable={isClearable}
      isSearchable
      isMulti={isMulti}
      inputValue={inputValue}
      onInputChange={(nextValue, meta) => {
        if (!onInputChange) return;
        if (meta.action === 'input-change') {
          onInputChange(nextValue);
        }
        if (meta.action === 'menu-close') {
          onInputChange(nextValue);
        }
      }}
      isLoading={isLoading}
      classNamePrefix="rs"
      noOptionsMessage={() => (isLoading ? 'Buscando...' : 'Sin resultados')}
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
