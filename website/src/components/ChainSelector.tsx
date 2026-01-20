import { useState, useRef, useEffect } from "react";
import { useSwitchChain } from "wagmi";
import { hemiSepolia } from "wagmi/chains";
import { useChainQueryState } from "../hooks/useChainQueryState";

type ChainOption = {
  name: "hemi" | "hemiSepolia";
  displayName: string;
  fullName: string;
  chainId: number;
};

const chainOptions: ChainOption[] = [
  // TODO enable hemi mainnet
  // {
  //   name: "hemi",
  //   displayName: "Mainnet",
  //   fullName: "Hemi Mainnet",
  //   chainId: hemi.id,
  // },
  {
    name: "hemiSepolia",
    displayName: "Testnet",
    fullName: "Hemi Sepolia",
    chainId: hemiSepolia.id,
  },
];

export function ChainSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [selectedChainName, setSelectedChainName] = useChainQueryState();
  const { switchChain } = useSwitchChain();

  const selectedOption = chainOptions.find(
    (opt) => opt.name === selectedChainName,
  );

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  const handleSelect = (option: ChainOption) => {
    // Update URL state
    setSelectedChainName(option.name);

    // Switch chain in wagmi
    if (switchChain) {
      switchChain({ chainId: option.chainId });
    }

    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors flex items-center gap-2 min-w-[140px] justify-between"
      >
        <span className="font-medium text-gray-900">
          {selectedOption?.displayName || "Select Chain"}
        </span>
        <svg
          className={`w-4 h-4 text-gray-600 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-10">
          {chainOptions.map((option) => (
            <button
              key={option.name}
              onClick={() => handleSelect(option)}
              className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center justify-between ${
                selectedChainName === option.name ? "bg-blue-50" : ""
              }`}
            >
              <div>
                <div className="font-medium text-gray-900">
                  {option.displayName}
                </div>
                <div className="text-sm text-gray-500">{option.fullName}</div>
              </div>
              {selectedChainName === option.name && (
                <svg
                  className="w-5 h-5 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
