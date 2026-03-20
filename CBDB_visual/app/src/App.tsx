import { useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { TreeProvider, useTreeState, useTreeDispatch } from './state/TreeContext';
import { Header } from './components/layout/Header';
import { FilterPanel } from './components/layout/FilterPanel';
import { DetailSidebar } from './components/layout/DetailSidebar';
import { SearchBar } from './components/search/SearchBar';
import { GridContainer } from './components/visualization/GridContainer';
import { useUrlParams } from './hooks/useUrlParams';
import { usePersonData } from './hooks/usePersonData';
import './App.css';

function AppContent() {
  const { i18n } = useTranslation();
  const { rootPersonID, filters, gridData, selectedPersonID } = useTreeState();
  const dispatch = useTreeDispatch();
  const { searchPerson } = usePersonData();
  const { initialPersonID } = useUrlParams(rootPersonID, i18n.language);

  useEffect(() => {
    if (initialPersonID && initialPersonID > 0) {
      searchPerson(initialPersonID);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleRelationship = useCallback((rel: string) => {
    dispatch({ type: 'TOGGLE_RELATIONSHIP_FILTER', relationship: rel });
  }, [dispatch]);

  const handleSetGender = useCallback((g: 'all' | 'male' | 'female') => {
    dispatch({ type: 'SET_GENDER_FILTER', gender: g });
  }, [dispatch]);

  const hasData = gridData.some(c => !c.isEmpty);

  const selectedCell = useMemo(() => {
    if (!selectedPersonID) return null;
    return gridData.find(c => c.personID === selectedPersonID) ?? null;
  }, [gridData, selectedPersonID]);

  const handleCloseSidebar = useCallback(() => {
    dispatch({ type: 'SELECT_PERSON', personID: null });
  }, [dispatch]);

  return (
    <div className="app">
      <Header />
      <main className="app-main">
        <SearchBar />
        {hasData && (
          <FilterPanel
            activeRelationships={filters.relationshipTypes}
            onToggleRelationship={handleToggleRelationship}
            gender={filters.gender}
            onSetGender={handleSetGender}
          />
        )}
        <div className="grid-with-sidebar">
          {selectedCell && <DetailSidebar cell={selectedCell} onClose={handleCloseSidebar} />}
          <GridContainer />
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <TreeProvider>
      <AppContent />
    </TreeProvider>
  );
}

export default App;
