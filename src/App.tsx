import React, { useState } from 'react';
import { LeagueSelector } from './components/LeagueSelector';
import { Dashboard } from './components/Dashboard';
import { ConsolidatedLeague } from './types/sleeper';

function App() {
  const [selectedLeague, setSelectedLeague] = useState<ConsolidatedLeague | null>(null);

  const handleLeagueSelect = (league: ConsolidatedLeague) => {
    setSelectedLeague(league);
  };

  const handleBack = () => {
    setSelectedLeague(null);
  };

  return (
    <div className="App">
      {selectedLeague ? (
        <Dashboard league={selectedLeague} onBack={handleBack} />
      ) : (
        <LeagueSelector onLeagueSelect={handleLeagueSelect} />
      )}
    </div>
  );
}

export default App;