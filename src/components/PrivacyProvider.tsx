"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface PrivacyContextType {
  hidden: boolean;
  toggle: () => void;
}

const PrivacyContext = createContext<PrivacyContextType>({
  hidden: true,
  toggle: () => {},
});

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("privacy-hidden");
    if (stored === "false") {
      setHidden(false);
    }
    setLoaded(true);
  }, []);

  function toggle() {
    setHidden((h) => {
      const next = !h;
      localStorage.setItem("privacy-hidden", String(next));
      return next;
    });
  }

  if (!loaded) return null;

  return (
    <PrivacyContext.Provider value={{ hidden, toggle }}>
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  return useContext(PrivacyContext);
}

export function MaskedValue({
  value,
  className,
  isCurrency = true,
}: {
  value: string;
  className?: string;
  isCurrency?: boolean;
}) {
  const { hidden } = usePrivacy();
  if (hidden) {
    return (
      <span className={className}>
        {isCurrency ? "$" : ""}
        <span className="tracking-wider">•••••</span>
      </span>
    );
  }
  return <span className={className}>{value}</span>;
}
