import { createContext, useContext, useState } from "react";

// Setting Type of data of `interface`
interface FilterState {
  platform: string;
  sentiment: string;
  relevance: string;
  hasCriticism: string;
  search: string;
  sortOrder: string;
  page: number;
}

// Setting `Context` type
interface FilterContextType {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
}

// Create `Context`
const FilterContext = createContext<FilterContextType | null>(null);

// Provide Filter data
export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<FilterState>({
    page: 1,
    sortOrder: "desc",
    platform: "",
    sentiment: "",
    relevance: "",
    hasCriticism: "",
    search: "",
  });

  return (
    <FilterContext.Provider value={{ filters, setFilters }}>
      {children}
    </FilterContext.Provider>
  );
}

// Create Hook，Easy to get `Context`
export function useFilters() {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error("useFilters must be used within a FilterProvider");
  }
  return context;
}
