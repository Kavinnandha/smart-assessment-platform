import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface BreadcrumbContextType {
    labels: Record<string, string>;
    setLabel: (path: string, label: string) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextType | undefined>(undefined);

export const BreadcrumbProvider = ({ children }: { children: ReactNode }) => {
    const [labels, setLabels] = useState<Record<string, string>>({});

    const setLabel = useCallback((path: string, label: string) => {
        setLabels((prev) => ({
            ...prev,
            [path]: label,
        }));
    }, []);

    return (
        <BreadcrumbContext.Provider value={{ labels, setLabel }}>
            {children}
        </BreadcrumbContext.Provider>
    );
};

export const useBreadcrumb = () => {
    const context = useContext(BreadcrumbContext);
    if (!context) {
        throw new Error('useBreadcrumb must be used within a BreadcrumbProvider');
    }
    return context;
};
