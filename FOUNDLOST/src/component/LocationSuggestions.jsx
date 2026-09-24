import React from "react";

const LocationSuggestions = ({ locations, onSelect }) => {
  if (locations.length === 0) return null;

  return (
    <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded border bg-white shadow-lg">
      {locations.map((location) => (
        <li key={location.name}>
          <button
            type="button"
            className="w-full cursor-pointer px-3 py-2 text-left hover:bg-slate-100"
            onClick={() => onSelect(location)}
          >
            {location.name}
          </button>
        </li>
      ))}
    </ul>
  );
};

export default LocationSuggestions;
