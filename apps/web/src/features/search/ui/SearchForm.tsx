import { SearchInputForm } from './SearchInputForm';

interface SearchFormProps {
  defaultValue?: string;
}

export function SearchForm({ defaultValue = '' }: SearchFormProps) {
  return (
    <SearchInputForm
      action="/search"
      defaultValue={defaultValue}
      inputId="search-input"
      label="통합검색"
      variant="xlarge"
    />
  );
}
