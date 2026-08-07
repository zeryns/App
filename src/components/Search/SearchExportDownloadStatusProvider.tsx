import useExportDownloadStatusModal from '@hooks/useExportDownloadStatusModal';

import React, {createContext, useContext} from 'react';

import {useSearchSelectionActions} from './SearchContext';

type SearchExportDownloadStatusContextValue = {
    /** Start tracking a queued export so the shared status modal renders for it */
    trackExport: (exportID: string) => void;
};

const SearchExportDownloadStatusContext = createContext<SearchExportDownloadStatusContextValue>({
    trackExport: () => {},
});

type SearchExportDownloadStatusProviderProps = {
    /** The children to render inside the provider */
    children: React.ReactNode;
};

/**
 * Owns the queued export status modal for the Search bulk-actions flow. The state lives here, above
 * SearchPage's narrow/wide layout branches, each of which mounts its own SearchBulkActionsButton, so the
 * modal survives layout changes that would otherwise remount the button and orphan the in-flight export.
 */
function SearchExportDownloadStatusProvider({children}: SearchExportDownloadStatusProviderProps) {
    const {selectAllMatchingItems, clearSelectedTransactions} = useSearchSelectionActions();
    const {trackExport, exportDownloadStatusModal} = useExportDownloadStatusModal(() => {
        selectAllMatchingItems(false);
        clearSelectedTransactions(undefined, true);
    });

    return (
        <SearchExportDownloadStatusContext.Provider value={{trackExport}}>
            {exportDownloadStatusModal}
            {children}
        </SearchExportDownloadStatusContext.Provider>
    );
}

function useSearchExportDownloadStatus(): SearchExportDownloadStatusContextValue {
    return useContext(SearchExportDownloadStatusContext);
}

export {SearchExportDownloadStatusProvider, useSearchExportDownloadStatus};
