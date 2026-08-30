"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { WorkflowVarPayload } from "./variableDrag";

type VariableDragContextValue = {
  payload: WorkflowVarPayload | null;
  focusedField: string | null;
  dropError: string | null;
  setPayload: (next: WorkflowVarPayload | null) => void;
  setFocusedField: (field: string | null) => void;
  setDropError: (message: string | null) => void;
};

const VariableDragContext = createContext<VariableDragContextValue | null>(null);

export const VariableDragProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [payload, setPayloadState] = useState<WorkflowVarPayload | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [dropError, setDropErrorState] = useState<string | null>(null);

  const setPayload = useCallback((next: WorkflowVarPayload | null) => {
    setPayloadState(next);
    if (next) setDropErrorState(null);
  }, []);

  const setDropError = useCallback((message: string | null) => {
    setDropErrorState(message);
    if (message) {
      window.setTimeout(() => {
        setDropErrorState((current) => (current === message ? null : current));
      }, 2800);
    }
  }, []);

  const value = useMemo(
    () => ({
      payload,
      focusedField,
      dropError,
      setPayload,
      setFocusedField,
      setDropError,
    }),
    [payload, focusedField, dropError, setPayload, setDropError]
  );

  return (
    <VariableDragContext.Provider value={value}>
      {children}
    </VariableDragContext.Provider>
  );
};

export function useVariableDrag(): VariableDragContextValue {
  const ctx = useContext(VariableDragContext);
  if (!ctx) {
    return {
      payload: null,
      focusedField: null,
      dropError: null,
      setPayload: () => {},
      setFocusedField: () => {},
      setDropError: () => {},
    };
  }
  return ctx;
}
